import { supabase } from './supabase.service'
import { cacheSaveAll, cacheGetAll } from './cache.service'
import { queries, queryWrite, queryRead, abortAllRequests as abortSBQueries, invalidateCache } from './supabase-query.service'

const DIRTY_KEY_PREFIX = 'dental_dirty_'
let _activeDirtyKey = 'dental_dirty_state' // fallback for migration

export function setDirtyKeyUid(uid) {
  _activeDirtyKey = uid ? `${DIRTY_KEY_PREFIX}${uid}` : 'dental_dirty_state'
  // Migrate old global dirty state to uid-scoped key
  if (uid) {
    try {
      const old = localStorage.getItem('dental_dirty_state')
      if (old && !localStorage.getItem(_activeDirtyKey)) {
        localStorage.setItem(_activeDirtyKey, old)
        localStorage.removeItem('dental_dirty_state')
      }
    } catch { /* ignore */ }
  }
  // Reload dirty state from the correct uid-scoped key
  const fresh = _loadDirtyState()
  _dirtyMonths.clear()
  for (const m of (fresh.months || [])) _dirtyMonths.add(m)
  _debtsDirty = fresh.debts || false
  _apptsDirty = fresh.appts || false
  _configDirty = fresh.config || false
}

function _loadDirtyState() {
  try {
    const raw = localStorage.getItem(_activeDirtyKey)
    if (!raw) return { months: [], debts: false, appts: false, config: false }
    return JSON.parse(raw)
  } catch { return { months: [], debts: false, appts: false, config: false } }
}

function _persistDirtyState() {
  const payload = JSON.stringify({
    months: [..._dirtyMonths],
    debts: _debtsDirty,
    appts: _apptsDirty,
    config: _configDirty,
  })
  try {
    localStorage.setItem(_activeDirtyKey, payload)
  } catch (e) {
    // Losing the dirty flags means unsynced edits could be forgotten after a
    // restart. This is critical, so surface it instead of swallowing silently.
    console.error('[Sync] Failed to persist dirty state — unsynced changes may be lost on restart:', e)
  }
}

const _saved = _loadDirtyState()
const _dirtyMonths = new Set(_saved.months || [])
let _debtsDirty = _saved.debts || false
let _apptsDirty = _saved.appts || false
let _configDirty = _saved.config || false
const _knownMonths = new Set()
const _loadedMonths = new Set()

// ── Concurrent sync guard (queue-based) ──
let _saveLock = false
let _loadLock = false
let _pendingSave = null // Promise resolver for queued save

export function resetSyncState() {
  _dirtyMonths.clear()
  _debtsDirty = false
  _apptsDirty = false
  _configDirty = false
  _knownMonths.clear()
  _loadedMonths.clear()
  _saveLock = false
  _loadLock = false
  _pendingSave = null
  _persistDirtyState()
}

export function markMonthDirty(dateStr) {
  const month = monthOf(dateStr)
  if (month) {
    _dirtyMonths.add(month)
    _persistDirtyState()
  }
}

export function markDebtsDirty() {
  _debtsDirty = true
  _persistDirtyState()
}

export function markApptsDirty() {
  _apptsDirty = true
  _persistDirtyState()
}

export function markConfigDirty() {
  _configDirty = true
  _persistDirtyState()
}

export function monthOf(d) {
  return (d || '').substring(0, 7)
}

export function getKnownMonths() {
  return _knownMonths
}

export function getLoadedMonths() {
  return _loadedMonths
}

export function getDirtyMonths() {
  return new Set(_dirtyMonths)
}

export function isDebtsDirty() {
  return _debtsDirty
}

export function isApptsDirty() {
  return _apptsDirty
}

const CHUNK_THRESHOLD = 500

export function buildMonthDoc(month, records, prosthetics) {
  return {
    records: records.filter(r => monthOf(r.date) === month),
    prosthetics: prosthetics.filter(p => monthOf(p.date) === month),
    _ts: Date.now(),
  }
}

export function buildMonthChunks(month, records, prosthetics) {
  const doc = buildMonthDoc(month, records, prosthetics)
  const total = doc.records.length + doc.prosthetics.length
  if (total <= CHUNK_THRESHOLD) return [{ key: month, doc }]

  const chunks = []
  const chunkSize = CHUNK_THRESHOLD
  for (let i = 0; i < doc.records.length; i += chunkSize) {
    const idx = chunks.length
    chunks.push({
      key: idx === 0 ? month : `${month}__c${idx}`,
      doc: {
        records: doc.records.slice(i, i + chunkSize),
        prosthetics: idx === 0 ? doc.prosthetics : [],
        _ts: Date.now(),
        _chunk: idx,
        _totalChunks: null,
      },
    })
  }
  if (chunks.length > 0 && chunks[0].doc.prosthetics.length === 0 && doc.prosthetics.length > 0) {
    chunks[0].doc.prosthetics = doc.prosthetics
  }
  for (const c of chunks) c.doc._totalChunks = chunks.length
  return chunks
}

export function mergeMonthData(month, data, records, prosthetics) {
  if (!data) return { records, prosthetics }
  const otherRecords = records.filter(r => monthOf(r.date) !== month)
  const otherProsthetics = prosthetics.filter(p => monthOf(p.date) !== month)
  const localMonthRecords = records.filter(r => monthOf(r.date) === month)
  const localMonthProsthetics = prosthetics.filter(p => monthOf(p.date) === month)
  // Merge server data with local data instead of replacing — preserves unsynced local items
  const mergedRecords = mergeByMod(data.records || [], localMonthRecords)
  const mergedProsthetics = mergeByMod(data.prosthetics || [], localMonthProsthetics)
  return {
    records: [...otherRecords, ...mergedRecords],
    prosthetics: [...otherProsthetics, ...mergedProsthetics],
  }
}

function mergeByMod(existingItems, newItems) {
  if (!Array.isArray(existingItems) || !Array.isArray(newItems)) {
    return newItems || existingItems || []
  }
  const map = new Map()
  for (const item of existingItems) {
    if (item.id) map.set(item.id, item)
  }
  for (const item of newItems) {
    if (!item.id) continue
    const existing = map.get(item.id)
    if (!existing || (item._mod || 0) >= (existing._mod || 0)) {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

async function conflictSafeUpsert(uid, dataType, dataKey, newData) {
  const existing = await queryRead(uid, dataType, dataKey, { skipCache: true })
  if (existing && existing._ts && newData._ts && existing._ts > newData._ts) {
    const merged = { ...newData }
    if (Array.isArray(existing.records) && Array.isArray(newData.records)) {
      merged.records = mergeByMod(existing.records, newData.records)
    }
    if (Array.isArray(existing.prosthetics) && Array.isArray(newData.prosthetics)) {
      merged.prosthetics = mergeByMod(existing.prosthetics, newData.prosthetics)
    }
    return queryWrite(uid, dataType, dataKey, { ...merged, _ts: Date.now() })
  }
  return queryWrite(uid, dataType, dataKey, { ...newData, _ts: Date.now() })
}

export async function saveToSupabase(uid, { records, prosthetics, debts, config, appointments }, showOl = false, force = false) {
  if (!uid || typeof uid !== 'string' || uid.length < 10) {
    console.error('[Sync] Invalid uid, aborting save')
    return false
  }
  // Prevent concurrent saves — queue instead of dropping
  if (_saveLock) {
    // Wait for the current save to finish instead of force-unlocking
    if (_pendingSave) {
      // Another save is already waiting — skip to avoid unbounded queue
      console.warn('[Sync] Save already queued, merging')
      return false
    }
    try {
      await new Promise((resolve, reject) => {
        _pendingSave = resolve
        // Safety timeout: if the lock is stuck for 15s, release it
        setTimeout(() => {
          if (_pendingSave === resolve) {
            _pendingSave = null
            console.warn('[Sync] Save lock stuck for 15s, releasing')
            resolve()
          }
        }, 15000)
      })
    } catch {
      return false
    }
  }
  _saveLock = true

  try {
    const ops = []
    const isFullSync = showOl || force
    const monthsToSave = isFullSync
      ? [...new Set([...records.map(r => monthOf(r.date)), ...prosthetics.map(p => monthOf(p.date))])].filter(Boolean)
      : [..._dirtyMonths]

    // Skip save if nothing is dirty and not a forced full sync
    if (!isFullSync && !monthsToSave.length && !_debtsDirty && !_apptsDirty && !_configDirty) {
      return true
    }

    const allKnown = [...new Set([..._knownMonths, ...monthsToSave])].filter(Boolean).sort()

    for (const m of monthsToSave) {
      const chunks = buildMonthChunks(m, records, prosthetics)
      for (const { key, doc } of chunks) {
        ops.push(conflictSafeUpsert(uid, 'month', key, doc))
      }
    }

    const savedDebts = isFullSync || _debtsDirty
    if (savedDebts) {
      ops.push(queries.saveDebts(uid, debts))
    }

    const savedAppts = isFullSync || _apptsDirty
    if (savedAppts) {
      ops.push(queries.saveAppointments(uid, appointments))
    }

    const savedConfig = isFullSync || _configDirty
    if (savedConfig) {
      ops.push(queries.saveConfig(uid, config))
    }

    // Persist month/debts/appts/config documents FIRST. The index is written
    // only after these succeed, so a reader on another device can never see a
    // month listed in the index whose document failed to write (near-atomic).
    await Promise.all(ops)

    await queries.saveIndex(uid, { months: allKnown })

    // Only mark months as known after both their documents and the index that
    // references them have been persisted.
    for (const m of monthsToSave) _knownMonths.add(m)

    // Clear dirty flags only after successful save
    if (savedDebts) _debtsDirty = false
    if (savedAppts) _apptsDirty = false
    if (savedConfig) _configDirty = false
    for (const m of monthsToSave) {
      _dirtyMonths.delete(m)
    }
    _persistDirtyState()

    return true
  } catch (e) {
    console.error('[Sync] save error:', e)
    return false
  } finally {
    _saveLock = false
    // Wake up queued save if any
    if (_pendingSave) {
      const resolve = _pendingSave
      _pendingSave = null
      resolve()
    }
  }
}

function getCurrentAndPreviousMonth() {
  const now = new Date()
  const cur = now.toISOString().substring(0, 7)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7)
  return [cur, prev]
}

async function batchFetchMonths(uid, months, batchSize = 5) {
  const results = []
  for (let i = 0; i < months.length; i += batchSize) {
    const batch = months.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(m => queries.getMonth(uid, m)))
    results.push(...batchResults)
    batch.forEach(m => _loadedMonths.add(m))
  }
  return results
}

export async function loadFromSupabase(uid, { loadAllMonthsFlag = false, onProgress = null } = {}) {
  // Prevent concurrent loads from racing
  if (_loadLock) {
    console.warn('[Sync] Load already in progress, skipping')
    return { records: [], prosthetics: [], debts: [], config: null, appointments: [], _loadSucceeded: false }
  }
  _loadLock = true

  const results = {
    records: [],
    prosthetics: [],
    debts: [],
    config: null,
    appointments: [],
    _loadSucceeded: false,
  }

  try {
    if (onProgress) onProgress(10)

    const [index, debtsData, apptsData, cfgData] = await Promise.all([
      queries.getIndex(uid),
      queries.getDebts(uid),
      queries.getAppointments(uid),
      queries.getConfig(uid),
    ])

    if (onProgress) onProgress(30)

    if (debtsData) results.debts = debtsData
    if (apptsData) results.appointments = apptsData
    if (cfgData) results.config = cfgData

    const months = index?.months || []
    months.forEach(m => _knownMonths.add(m))

    let monthsToLoad
    if (loadAllMonthsFlag) {
      monthsToLoad = months
    } else {
      const [curMonth, prevMonth] = getCurrentAndPreviousMonth()
      monthsToLoad = months.filter(m => m === curMonth || m === prevMonth)
    }

    if (onProgress) onProgress(40)

    const monthResults = await batchFetchMonths(uid, monthsToLoad)

    if (onProgress) onProgress(80)

    monthResults.forEach(data => {
      if (data) {
        if (data.records) results.records.push(...data.records)
        if (data.prosthetics) results.prosthetics.push(...data.prosthetics)
      }
    })

    if (loadAllMonthsFlag) {
      monthsToLoad.forEach(m => _loadedMonths.add(m))
    }

    // Mark load as fully succeeded — safe for reconciliation
    results._loadSucceeded = true

    if (onProgress) onProgress(100)
  } catch (e) {
    console.error('[Sync] load error:', e)
    // results._loadSucceeded remains false — prevents reconciliation on partial data
  } finally {
    _loadLock = false
  }

  return results
}

export async function ensureMonthLoaded(uid, month) {
  if (_loadedMonths.has(month)) return null
  try {
    const data = await queries.getMonth(uid, month)
    _loadedMonths.add(month)
    return data
  } catch (e) {
    console.error('[Sync] lazy load month error:', e)
    return null
  }
}

export async function loadAllMonths(uid) {
  const results = { records: [], prosthetics: [] }
  const months = [..._knownMonths].filter(m => !_loadedMonths.has(m))
  if (!months.length) return results

  const monthResults = await batchFetchMonths(uid, months)
  monthResults.forEach(data => {
    if (data) {
      if (data.records) results.records.push(...data.records)
      if (data.prosthetics) results.prosthetics.push(...data.prosthetics)
    }
  })
  return results
}

/**
 * Load ALL months from Supabase and merge into the store.
 * Used for on-demand search of old patient records.
 * Returns all records and prosthetics from all months.
 */
export async function loadAllMonthsFull(uid) {
  // First ensure we have the index
  const index = await queries.getIndex(uid)
  const months = index?.months || []
  months.forEach(m => _knownMonths.add(m))

  const allMonths = months.filter(m => !_loadedMonths.has(m))
  if (!allMonths.length) return { records: [], prosthetics: [] }

  const results = { records: [], prosthetics: [] }
  const monthResults = await batchFetchMonths(uid, allMonths)
  monthResults.forEach(data => {
    if (data) {
      if (data.records) results.records.push(...data.records)
      if (data.prosthetics) results.prosthetics.push(...data.prosthetics)
    }
  })
  return results
}

/**
 * Search for patient records by name using Supabase RPC function.
 * The RPC filters inside the JSON on the server — only matching records are returned.
 * Reduces data transfer by ~90% compared to fetching all months.
 */
export async function searchByNameFromServer(uid, searchName, { limit = 200, offset = 0 } = {}) {
  if (!searchName || !uid) return { records: [], prosthetics: [], hasMore: false }

  const trimmed = searchName.trim()
  if (!trimmed) return { records: [], prosthetics: [], hasMore: false }

  try {
    const { data, error } = await supabase
      .rpc('search_patient_by_name', {
        p_user_id: uid,
        p_search_name: trimmed,
        p_limit: limit + 1,
        p_offset: offset,
      })

    if (error) {
      // Fallback for old RPC without pagination params
      if (error.message?.includes('p_limit') || error.message?.includes('p_offset')) {
        const { data: fbData, error: fbErr } = await supabase
          .rpc('search_patient_by_name', {
            p_user_id: uid,
            p_search_name: trimmed,
          })
        if (fbErr) {
          console.error('[Search] RPC search error:', fbErr)
          return { records: [], prosthetics: [], hasMore: false }
        }
        return {
          records: fbData?.records || [],
          prosthetics: fbData?.prosthetics || [],
          hasMore: false,
        }
      }
      console.error('[Search] RPC search error:', error)
      return { records: [], prosthetics: [], hasMore: false }
    }

    const recs = data?.records || []
    const pros = data?.prosthetics || []
    const total = recs.length + pros.length
    const hasMore = total > limit
    return {
      records: hasMore ? recs.slice(0, limit) : recs,
      prosthetics: hasMore ? pros.slice(0, limit) : pros,
      hasMore,
    }
  } catch (e) {
    console.error('[Search] searchByNameFromServer failed:', e)
    return { records: [], prosthetics: [], hasMore: false }
  }
}

/**
 * Load ALL debts from Supabase (fresh copy).
 */
export async function loadAllDebtsFromServer(uid) {
  const debtsData = await queries.getDebts(uid)
  return debtsData || []
}

/**
 * Search debts by patient name using Supabase RPC.
 * Returns only debts whose name matches the search string.
 */
export async function searchDebtsByNameFromServer(uid, searchName, { limit = 200, offset = 0 } = {}) {
  if (!searchName || !uid) return { debts: [], hasMore: false }

  const trimmed = searchName.trim()
  if (!trimmed) return { debts: [], hasMore: false }

  try {
    const { data, error } = await supabase
      .rpc('search_debts_by_name', {
        p_user_id: uid,
        p_search_name: trimmed,
        p_limit: limit + 1,
        p_offset: offset,
      })

    if (error) {
      // Fallback for old RPC without pagination params
      if (error.message?.includes('p_limit') || error.message?.includes('p_offset')) {
        const { data: fbData, error: fbErr } = await supabase
          .rpc('search_debts_by_name', {
            p_user_id: uid,
            p_search_name: trimmed,
          })
        if (fbErr) {
          console.error('[Search] RPC debts search error:', fbErr)
          return { debts: [], hasMore: false }
        }
        return { debts: fbData || [], hasMore: false }
      }
      console.error('[Search] RPC debts search error:', error)
      return { debts: [], hasMore: false }
    }

    const items = data || []
    const hasMore = items.length > limit
    return {
      debts: hasMore ? items.slice(0, limit) : items,
      hasMore,
    }
  } catch (e) {
    console.error('[Search] searchDebtsByNameFromServer failed:', e)
    return { debts: [], hasMore: false }
  }
}

let _activeChannel = null

export function setupRealtimeSubscriptions(uid, onUpdate) {
  // Prevent duplicate subscriptions — clean up existing channel first
  if (_activeChannel) {
    supabase.removeChannel(_activeChannel)
    _activeChannel = null
  }

  const unsubs = []
  let debounceTimer = null
  const DEBOUNCE_MS = 5000
  let _pendingPayloads = []

  function debouncedUpdate(payload) {
    if (payload?.new?.data_type) {
      _pendingPayloads.push(payload.new.data_type)
      // Invalidate query cache for changed types so next read fetches fresh
      invalidateCache(payload.new.data_type, payload?.new?.data_key || null)
    }

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      const changedTypes = [...new Set(_pendingPayloads)]
      _pendingPayloads = []
      onUpdate({ changedTypes })
    }, DEBOUNCE_MS)
  }

  const channel = supabase
    .channel(`user_data_${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${uid}`,
      },
      debouncedUpdate,
    )
    .subscribe()

  _activeChannel = channel

  unsubs.push(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    _pendingPayloads = []
    if (_activeChannel === channel) {
      supabase.removeChannel(channel)
      _activeChannel = null
    }
  })
  return unsubs
}

export function clearRealtimeSubscriptions(unsubs) {
  unsubs.forEach(fn => fn())
}
