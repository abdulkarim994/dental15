import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cacheGetAll, cacheSaveAll, cacheClear, loadAllFromIDB, clearIDB } from '@/services/cache.service'
import { loadDeletedIdsFromIDB, saveDeletedIdsToIDB, clearDeletedIdsFromIDB } from '@/services/deleted-ids.service'
import { saveToSupabase, loadFromSupabase, markMonthDirty, markDebtsDirty, markApptsDirty, markConfigDirty, loadAllMonthsFull, loadAllDebtsFromServer, searchByNameFromServer, searchDebtsByNameFromServer, resetSyncState, monthOf, getDirtyMonths, isDebtsDirty, isApptsDirty, getLoadedMonths, setDirtyKeyUid } from '@/services/sync.service'
import { getCurrentMonth } from '@/utils/format'
import { validateRecords, validateDebts, validateAppointments, validateConfig } from '@/utils/sanitize'
import { useRecordsStore } from './records.store'
import { useDebtsStore as useDebtsSubStore } from './debts.store'
import { useAppointmentsStore } from './appointments.store'
import { useConfigStore, DEFAULT_CONFIG } from './config.store'
import { useSyncStore } from './sync.store'
import { usePatientsStore } from './patients.store'
import { startBackgroundSync, stopBackgroundSync, cacheSupabaseData } from '@/services/background-sync.service'
import { migrateData, getDataVersion, CURRENT_VERSION } from '@/services/data-migration.service'
import { generateId } from '@/utils/uid'

export const useAppStore = defineStore('app', () => {
  const recordsStore = useRecordsStore()
  const debtsSubStore = useDebtsSubStore()
  const appointmentsStore = useAppointmentsStore()
  const configStore = useConfigStore()
  const syncSt = useSyncStore()
  const patientsStore = usePatientsStore()

  // Track locally deleted IDs to prevent _mergeById from re-adding them
  // Stored in IndexedDB for security (not plain localStorage) with max limit
  const _deletedIds = new Set()
  const MAX_DELETED_IDS = 10000
  let _deletedIdsLoaded = false
  let _deletedIdsPromise = null

  async function _loadDeletedIds() {
    // Always load from localStorage first (sync, reliable)
    try {
      const raw = localStorage.getItem('dental_deleted_ids')
      if (raw) JSON.parse(raw).forEach(id => _deletedIds.add(id))
    } catch { /* ignore */ }
    // Then load from IDB (may have additional IDs)
    try {
      const ids = await loadDeletedIdsFromIDB()
      ids.forEach(id => _deletedIds.add(id))
    } catch { /* IDB failed — localStorage already loaded */ }
    _deletedIdsLoaded = true
  }

  function _persistDeletedIds() {
    // Enforce max limit — keep newest entries by trimming oldest
    if (_deletedIds.size > MAX_DELETED_IDS) {
      const arr = [..._deletedIds]
      const excess = arr.length - MAX_DELETED_IDS
      for (let i = 0; i < excess; i++) _deletedIds.delete(arr[i])
    }
    // Save to localStorage (sync, survives app close)
    try { localStorage.setItem('dental_deleted_ids', JSON.stringify([..._deletedIds])) } catch { /* storage full */ }
    // Also save to IDB (async, larger capacity)
    saveDeletedIdsToIDB([..._deletedIds]).catch(() => {})
  }

  function trackDeletion(id) {
    if (id) {
      _deletedIds.add(id)
      _persistDeletedIds()
    }
  }

  function trackDeletionBatch(ids) {
    if (!ids || !ids.length) return
    ids.forEach(id => { if (id) _deletedIds.add(id) })
    _persistDeletedIds()
  }

  function clearDeletedIds() {
    _deletedIds.clear()
    clearDeletedIdsFromIDB().catch(() => {})
    try { localStorage.removeItem('dental_deleted_ids') } catch { /* ignore */ }
  }

  /**
   * Cleanup: remove IDs from _deletedIds that have been successfully
   * synced (server no longer has them). Call after a successful full sync.
   */
  function pruneDeletedIds(serverRecordIds, serverProsIds, serverDebtIds) {
    if (!_deletedIds.size) return
    const serverIds = new Set([
      ...(serverRecordIds || []),
      ...(serverProsIds || []),
      ...(serverDebtIds || []),
    ])
    let pruned = false
    for (const id of _deletedIds) {
      // If server no longer has this ID, deletion was confirmed — safe to forget
      if (!serverIds.has(id)) {
        _deletedIds.delete(id)
        pruned = true
      }
    }
    if (pruned) _persistDeletedIds()
  }

  // Load tracked deletions on startup — store promise so others can await it
  _deletedIdsPromise = _loadDeletedIds()

  // Sync mutex — prevents syncSave and syncLoad from racing
  let _syncMutex = null

  const records = computed({
    get: () => recordsStore.records,
    set: (v) => { recordsStore.records = v },
  })
  const prosthetics = computed({
    get: () => recordsStore.prosthetics,
    set: (v) => { recordsStore.prosthetics = v },
  })
  const debts = computed({
    get: () => debtsSubStore.debts,
    set: (v) => { debtsSubStore.debts = v },
  })
  const appointments = computed({
    get: () => appointmentsStore.appointments,
    set: (v) => { appointmentsStore.appointments = v },
  })
  const config = computed({
    get: () => configStore.config,
    set: (v) => { configStore.config = v },
  })

  const activeTab = ref('add')
  const selectedMonth = ref(getCurrentMonth())

  const syncing = computed({
    get: () => syncSt.syncing,
    set: (v) => { syncSt.syncing = v },
  })
  const syncMessage = computed({
    get: () => syncSt.syncMessage,
    set: (v) => { syncSt.syncMessage = v },
  })
  const syncProgress = computed({
    get: () => syncSt.syncProgress,
    set: (v) => { syncSt.syncProgress = v },
  })

  const currency = computed(() => configStore.currency)
  const centerName = computed(() => configStore.centerName)
  const clinics = computed(() => configStore.clinics)
  const services = computed(() => configStore.services)
  const payments = computed(() => configStore.payments)

  function loadFromCache(uid) {
    if (!uid) return
    const cached = cacheGetAll(uid)
    const migrated = getDataVersion() < CURRENT_VERSION
      ? migrateData(cached)
      : cached
    const validRecs = validateRecords(migrated.records)
    const validPros = validateRecords(migrated.prosthetics)
    const validDebts = validateDebts(migrated.debts)
    const validAppts = validateAppointments(migrated.appointments)
    const validConfig = validateConfig(migrated.config)
    // Filter out locally deleted items (sync may not be loaded yet — filter with current Set)
    if (validRecs.length) recordsStore.records = _mergeById([], validRecs)
    if (validPros.length) recordsStore.prosthetics = _mergeById([], validPros)
    if (validDebts.length) debtsSubStore.debts = _mergeById([], validDebts)
    if (validAppts.length) appointmentsStore.appointments = _mergeById([], validAppts)
    if (validConfig) configStore.config = { ...DEFAULT_CONFIG, ...validConfig }

    recordsStore.isLoadedFromCache = true
    debtsSubStore.isLoadedFromCache = true
    appointmentsStore.isLoadedFromCache = true
    patientsStore.isLoadedFromCache = true
  }

  function _filterByUid(uid) {
    if (!uid) return
    const match = (item) => !item.uid || item.uid === uid
    recordsStore.records = recordsStore.records.filter(match)
    recordsStore.prosthetics = recordsStore.prosthetics.filter(match)
    debtsSubStore.debts = debtsSubStore.debts.filter(match)
    appointmentsStore.appointments = appointmentsStore.appointments.filter(match)
  }

  function _mergeById(existing, incoming) {
    if (!existing || !existing.length) {
      if (_deletedIds.size > 0 && incoming?.length) {
        return incoming.filter(item => !item.id || !_deletedIds.has(item.id))
      }
      return incoming
    }
    const map = new Map()
    for (const item of existing) { if (item.id) map.set(item.id, item) }
    for (const item of incoming) {
      if (!item.id) continue
      // Skip items that were locally deleted
      if (_deletedIds.has(item.id)) continue
      const prev = map.get(item.id)
      if (!prev || (item._mod || 0) >= (prev._mod || 0)) map.set(item.id, item)
    }
    return [...map.values()]
  }

  /**
   * Remove local items that the server no longer has (deleted on another device).
   * Only applies to months/data types that were loaded and are not locally dirty.
   * IMPORTANT: Only safe to call when the server response is complete (not partial/truncated).
   * Pass loadSucceeded=false if the load had errors to skip reconciliation entirely.
   */
  function _reconcileRemoteDeletions(serverRecords, serverProsthetics, serverDebts, serverAppts, loadAllMonthsFlag, loadSucceeded = true) {
    // Never reconcile on partial/failed loads — would delete valid local data
    if (!loadSucceeded) return

    const dirtyMonths = getDirtyMonths()
    const loadedMonths = getLoadedMonths()

    // Build sets of server IDs for fast lookup
    const serverRecordIds = new Set(serverRecords.map(r => r.id).filter(Boolean))
    const serverProstheticIds = new Set(serverProsthetics.map(p => p.id).filter(Boolean))

    // For records/prosthetics: only reconcile months that were loaded and are not dirty
    if (serverRecordIds.size > 0 || serverProstheticIds.size > 0) {
      recordsStore.records = recordsStore.records.filter(r => {
        if (!r.id || !r.date) return true
        const m = monthOf(r.date)
        if (dirtyMonths.has(m)) return true
        if (!loadedMonths.has(m) && !loadAllMonthsFlag) return true
        return serverRecordIds.has(r.id)
      })
      recordsStore.prosthetics = recordsStore.prosthetics.filter(p => {
        if (!p.id || !p.date) return true
        const m = monthOf(p.date)
        if (dirtyMonths.has(m)) return true
        if (!loadedMonths.has(m) && !loadAllMonthsFlag) return true
        return serverProstheticIds.has(p.id)
      })
    }

    // For debts: reconcile only if not dirty AND server returned data
    // (empty array from server means no debts exist — only reconcile if we got a response)
    if (!isDebtsDirty() && serverDebts.length > 0) {
      const serverDebtIds = new Set(serverDebts.map(d => d.id).filter(Boolean))
      debtsSubStore.debts = debtsSubStore.debts.filter(d => {
        if (!d.id) return true
        return serverDebtIds.has(d.id)
      })
    }

    // For appointments: reconcile only if not dirty AND server returned data
    if (!isApptsDirty() && serverAppts.length > 0) {
      const serverApptIds = new Set(serverAppts.map(a => a.id).filter(Boolean))
      appointmentsStore.appointments = appointmentsStore.appointments.filter(a => {
        if (!a.id) return true
        return serverApptIds.has(a.id)
      })
    }
  }

  /**
   * Auto-repair: create missing records for debt installments.
   * Old DebtPayPopup code skipped record creation when toProfit=0 (lab-only payments).
   * This fills in the gap so all payments appear in visits and treasury.
   */
  function _repairMissingDebtPayRecords(uid) {
    if (!uid) return
    const recs = recordsStore.records
    const debts = debtsSubStore.debts
    const dp = configStore.config.doctorPct || 50
    const prosDebts = debts.filter(d => d.type === 'prosthetic' && d.installments?.length)
    if (!prosDebts.length) return
    const recIds = new Set(recs.map(r => r.id))
    const newRecs = []
    for (const debt of prosDebts) {
      const labValue = Number(debt.labValue || 0)
      let labPaidSoFar = 0
      const sorted = [...debt.installments].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      for (const inst of sorted) {
        const amt = Number(inst.amount || 0)
        if (amt <= 0) continue
        const hasRec = inst.recordId ? recIds.has(inst.recordId) : recs.some(r => r.isDebtPayment && r.debtId === debt.id && r.date === inst.date && Math.abs(Number(r._fullAmount || r.amount || 0) - amt) < 0.01)
        const labRem = Math.max(0, labValue - labPaidSoFar)
        const toLab = Math.min(amt, labRem)
        const toProfit = amt - toLab
        const dProfit = toProfit > 0 ? toProfit * (dp / 100) : 0
        if (!hasRec) {
          const recId = inst.recordId || generateId()
          const svcLabel = debt.service ? 'دفعة تركيبات — ' + debt.service : 'تركيبات (دفعة دين)'
          newRecs.push({
            id: recId, uid, date: inst.date, name: debt.name,
            amount: amt, _fullAmount: amt, _labAmount: toLab, _docAmount: dProfit,
            clinic: debt.clinic, service: svcLabel, payment: inst.payment || 'كاش',
            isDebt: false, isPros: false, isDebtPayment: true, debtId: debt.id,
            debtPaymentType: 'partial', _mod: Date.now(), _t: 'r',
          })
          recIds.add(recId)
        }
        labPaidSoFar += toLab
      }
    }
    if (newRecs.length) {
      recordsStore.records = [...recs, ...newRecs]
      for (const r of newRecs) { if (r.date) markMonthDirty(r.date) }
    }
  }

  /**
   * Load all data from IndexedDB (async, offline-first).
   * Falls back to localStorage if IndexedDB is empty.
   * Always supplements missing data types from localStorage as safety net.
   */
  async function loadFromCacheAsync(uid) {
    if (!uid) return false
    // Scope dirty state to this user
    setDirtyKeyUid(uid)
    // Ensure _deletedIds are loaded before merging cached data
    if (_deletedIdsPromise) await _deletedIdsPromise
    const idbData = await loadAllFromIDB()
    if (idbData) {
      const validRecs = validateRecords(idbData.records)
      const validPros = validateRecords(idbData.prosthetics)
      const validDebts = validateDebts(idbData.debts)
      const validAppts = validateAppointments(idbData.appointments)
      const validConfig = idbData.config ? validateConfig(idbData.config) : null
      if (validRecs.length) recordsStore.records = _mergeById(recordsStore.records, validRecs)
      if (validPros.length) recordsStore.prosthetics = _mergeById(recordsStore.prosthetics, validPros)
      if (validDebts.length) debtsSubStore.debts = _mergeById(debtsSubStore.debts, validDebts)
      if (validAppts.length) appointmentsStore.appointments = _mergeById(appointmentsStore.appointments, validAppts)
      if (validConfig) configStore.config = { ...DEFAULT_CONFIG, ...validConfig }

      // Safety net: if IDB had partial data, supplement ALL types from localStorage
      const lsData = cacheGetAll(uid)
      if (!validRecs.length && lsData.records.length) {
        const lsRecs = validateRecords(lsData.records)
        if (lsRecs.length) recordsStore.records = _mergeById(recordsStore.records, lsRecs)
      }
      if (!validPros.length && lsData.prosthetics.length) {
        const lsPros = validateRecords(lsData.prosthetics)
        if (lsPros.length) recordsStore.prosthetics = _mergeById(recordsStore.prosthetics, lsPros)
      }
      if (!validDebts.length && lsData.debts.length) {
        const lsDebts = validateDebts(lsData.debts)
        if (lsDebts.length) debtsSubStore.debts = _mergeById(debtsSubStore.debts, lsDebts)
      }
      if (!validAppts.length && lsData.appointments.length) {
        const lsAppts = validateAppointments(lsData.appointments)
        if (lsAppts.length) appointmentsStore.appointments = _mergeById(appointmentsStore.appointments, lsAppts)
      }
      if (!validConfig && lsData.config) {
        const lsConfig = validateConfig(lsData.config)
        if (lsConfig) configStore.config = { ...DEFAULT_CONFIG, ...lsConfig }
      }

      // Filter out data belonging to other users (IDB is not uid-scoped)
      _filterByUid(uid)
      _repairMissingDebtPayRecords(uid)
      recordsStore.isLoadedFromCache = true
      debtsSubStore.isLoadedFromCache = true
      appointmentsStore.isLoadedFromCache = true
      patientsStore.isLoadedFromCache = true
      return true
    }
    // Fallback to localStorage
    loadFromCache(uid)
    _filterByUid(uid)
    _repairMissingDebtPayRecords(uid)
    return false
  }

  function saveToCache(uid) {
    return cacheSaveAll(uid, {
      records: recordsStore.records,
      prosthetics: recordsStore.prosthetics,
      debts: debtsSubStore.debts,
      config: configStore.config,
      appointments: appointmentsStore.appointments,
    })
  }

  async function saveToCacheAsync(uid) {
    const idbPromise = saveToCache(uid)
    if (idbPromise) await idbPromise
  }

  /**
   * Persist current state to local cache and sync to Supabase.
   * Convenience method to replace the repeated saveToCache + syncSave pattern.
   */
  async function persistAndSync(uid) {
    saveToCache(uid)
    return syncSave(uid, false)
  }

  async function syncSave(uid, showOl = false, force = false) {
    // Acquire sync mutex to prevent racing with syncLoad
    if (_syncMutex) await _syncMutex.catch(() => {})
    let _resolve
    _syncMutex = new Promise(r => { _resolve = r })

    if (showOl) {
      syncSt.syncing = true
      syncSt.syncMessage = 'جار حفظ البيانات...'
      syncSt.syncProgress = 0
    }
    try {
      if (showOl) syncSt.syncProgress = 10
      const ok = await saveToSupabase(uid, {
        records: recordsStore.records,
        prosthetics: recordsStore.prosthetics,
        debts: debtsSubStore.debts,
        config: configStore.config,
        appointments: appointmentsStore.appointments,
      }, showOl, force)
      if (showOl) syncSt.syncProgress = 100
      return ok
    } finally {
      if (showOl) syncSt.syncing = false
      _syncMutex = null
      _resolve()
    }
  }

  async function syncLoad(uid, showOl = false, { loadAllMonthsFlag = false } = {}) {
    // Acquire sync mutex to prevent racing with syncSave
    if (_syncMutex) await _syncMutex.catch(() => {})
    let _resolve
    _syncMutex = new Promise(r => { _resolve = r })

    if (showOl) {
      syncSt.syncing = true
      syncSt.syncMessage = 'جار تحميل البيانات...'
      syncSt.syncProgress = 0
    }
    try {
      // Ensure _deletedIds are loaded before merging server data
      if (_deletedIdsPromise) await _deletedIdsPromise
      const data = await loadFromSupabase(uid, {
        loadAllMonthsFlag,
        onProgress: showOl ? (p) => { syncSt.syncProgress = p } : null,
      })
      const validRecords = validateRecords(data.records)
      const validProsthetics = validateRecords(data.prosthetics)
      const validDebts = validateDebts(data.debts)
      const validAppts = validateAppointments(data.appointments)
      if (validRecords.length) recordsStore.records = _mergeById(recordsStore.records, validRecords)
      if (validProsthetics.length) recordsStore.prosthetics = _mergeById(recordsStore.prosthetics, validProsthetics)
      if (validDebts.length) debtsSubStore.debts = _mergeById(debtsSubStore.debts, validDebts)
      if (validAppts.length) appointmentsStore.appointments = _mergeById(appointmentsStore.appointments, validAppts)

      // Reconcile remote deletions: remove local items that the server no longer has
      // Only for loaded (non-dirty) data to avoid removing unsynced local changes
      // data._loadSucceeded is true only when the full response completed without errors
      _reconcileRemoteDeletions(validRecords, validProsthetics, validDebts, validAppts, loadAllMonthsFlag, data._loadSucceeded !== false)
      const validConfig = data.config ? validateConfig(data.config) : null
      if (validConfig) configStore.config = { ...DEFAULT_CONFIG, ...validConfig }
      if (showOl) syncSt.syncProgress = 100

      recordsStore.isLoadedFromCache = false
      debtsSubStore.isLoadedFromCache = false
      appointmentsStore.isLoadedFromCache = false
      patientsStore.isLoadedFromCache = false

      // Prune _deletedIds: remove IDs the server no longer has (confirmed deletion)
      pruneDeletedIds(
        validRecords.map(r => r.id),
        validProsthetics.map(p => p.id),
        validDebts.map(d => d.id),
      )

      // Populate the offline repository layer in the background (non-blocking)
      cacheSupabaseData({
        records: recordsStore.records,
        prosthetics: recordsStore.prosthetics,
        appointments: appointmentsStore.appointments,
      }).catch(() => {})
    } finally {
      if (showOl) syncSt.syncing = false
      _syncMutex = null
      _resolve()
    }
  }

  function addRecord(record) {
    recordsStore.addRecord(record)
  }

  function updateRecord(id, updates) {
    recordsStore.updateRecord(id, updates)
  }

  function deleteRecord(id) {
    trackDeletion(id)
    // Mark the record's month dirty so syncSave re-writes it without this record
    const rec = recordsStore.records.find(r => r.id === id)
    if (rec?.date) markMonthDirty(rec.date)
    recordsStore.deleteRecord(id)
  }

  function deleteProsthetic(id) {
    trackDeletion(id)
    const pros = recordsStore.prosthetics.find(p => p.id === id)
    if (pros?.date) markMonthDirty(pros.date)
    recordsStore.deleteProsthetic(id)
  }

  function addDebt(debt) {
    debtsSubStore.addDebt(debt)
  }

  function updateDebt(id, updates) {
    debtsSubStore.updateDebt(id, updates)
  }

  function deleteDebt(id) {
    trackDeletion(id)
    markDebtsDirty()
    debtsSubStore.deleteDebt(id)
  }

  function addAppointment(appt) {
    appointmentsStore.addAppointment(appt)
  }

  function removeAppointment(id) {
    trackDeletion(id)
    markApptsDirty()
    appointmentsStore.removeAppointment(id)
  }

  function updateConfig(updates) {
    configStore.updateConfig(updates)
    markConfigDirty()
  }

  function renameClinic(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return
    const now = Date.now()
    recordsStore.records = recordsStore.records.map(r =>
      r.clinic === oldName ? { ...r, clinic: newName, _mod: now } : r
    )
    recordsStore.prosthetics = recordsStore.prosthetics.map(p =>
      p.clinic === oldName ? { ...p, clinic: newName, _mod: now } : p
    )
    debtsSubStore.debts = debtsSubStore.debts.map(d =>
      d.clinic === oldName ? { ...d, clinic: newName, _mod: now } : d
    )
    appointmentsStore.appointments = appointmentsStore.appointments.map(a =>
      a.clinic === oldName ? { ...a, clinic: newName, _mod: now } : a
    )
    const clinics = [...(configStore.config.clinics || [])]
    const idx = clinics.indexOf(oldName)
    if (idx !== -1) clinics[idx] = newName
    configStore.updateConfig({ clinics })
    markConfigDirty()
    markMonthDirty(selectedMonth.value)
    markDebtsDirty()
    markApptsDirty()
    patientsStore.invalidatePatientCache()
  }

  function resetState() {
    recordsStore.records = []
    recordsStore.prosthetics = []
    debtsSubStore.debts = []
    appointmentsStore.appointments = []
    configStore.resetConfig()
    activeTab.value = 'add'
    selectedMonth.value = getCurrentMonth()
  }

  async function clearLocalData(uid, { isAccountSwitch = false } = {}) {
    resetState()
    resetSyncState()
    // Clear _deletedIds on account switch to prevent blocking another user's records.
    // On same-user logout, keep them — pruneDeletedIds will clean up after next syncLoad.
    if (isAccountSwitch) clearDeletedIds()
    if (uid) cacheClear(uid)
    await clearIDB()
    try {
      const { abortAllRequests, clearQueryCache } = await import('@/services/supabase-query.service')
      abortAllRequests()
      clearQueryCache()
    } catch { /* non-critical */ }
    try {
      const { clearPendingRequests } = await import('@/services/supabase.service')
      clearPendingRequests()
    } catch { /* non-critical */ }
    try {
      const { secureClearAll } = await import('@/services/secure-storage.service')
      await secureClearAll()
    } catch { /* non-critical */ }
  }

  /**
   * Search for old patient records from Supabase.
   * Loads all months not yet loaded, merges into store, saves to IndexedDB.
   */
  async function searchFromServer(uid, searchName = '') {
    if (navigator.onLine === false) return false
    try {
      const data = await searchByNameFromServer(uid, searchName)
      if (data.records.length || data.prosthetics.length) {
        const existingIds = new Set(recordsStore.records.map(r => r.id))
        const existingProsIds = new Set(recordsStore.prosthetics.map(p => p.id))
        const newRecs = data.records.filter(r => !existingIds.has(r.id) && !_deletedIds.has(r.id))
        const newPros = data.prosthetics.filter(p => !existingProsIds.has(p.id) && !_deletedIds.has(p.id))
        if (newRecs.length) recordsStore.records = [...recordsStore.records, ...newRecs]
        if (newPros.length) recordsStore.prosthetics = [...recordsStore.prosthetics, ...newPros]
        patientsStore.invalidatePatientCache()
        saveToCache(uid)
      }
      return true
    } catch (e) {
      console.error('[Search] Server search failed:', e)
      return false
    }
  }

  /**
   * Load all debts from Supabase (fresh copy).
   */
  async function loadAllDebts(uid) {
    if (navigator.onLine === false) return false
    if (_deletedIdsPromise) await _deletedIdsPromise
    try {
      const debtsData = await loadAllDebtsFromServer(uid)
      if (debtsData.length) {
        const filtered = _deletedIds.size > 0
          ? debtsData.filter(d => !_deletedIds.has(d.id))
          : debtsData
        debtsSubStore.debts = _mergeById(debtsSubStore.debts, filtered)
        saveToCache(uid)
      }
      return true
    } catch (e) {
      console.error('[Debts] Load all debts failed:', e)
      return false
    }
  }

  /**
   * Search debts by name from Supabase (RPC — returns only matching debts).
   */
  async function searchDebtsFromServer(uid, searchName = '') {
    if (navigator.onLine === false) return false
    try {
      const result = await searchDebtsByNameFromServer(uid, searchName)
      const matchingDebts = result.debts || result
      if (matchingDebts.length) {
        const existingIds = new Set(debtsSubStore.debts.map(d => d.id))
        const newDebts = matchingDebts.filter(d => !existingIds.has(d.id) && !_deletedIds.has(d.id))
        if (newDebts.length) {
          debtsSubStore.debts = [...debtsSubStore.debts, ...newDebts]
          saveToCache(uid)
        }
      }
      return true
    } catch (e) {
      console.error('[Search] Debts server search failed:', e)
      return false
    }
  }

  /**
   * Search records by name from Supabase (RPC — returns only matching records).
   * Reuses the same search_patient_by_name RPC.
   */
  async function searchRecordsFromServer(uid, searchName = '') {
    if (navigator.onLine === false) return false
    try {
      const data = await searchByNameFromServer(uid, searchName)
      if (data.records.length || data.prosthetics.length) {
        const existingIds = new Set(recordsStore.records.map(r => r.id))
        const existingProsIds = new Set(recordsStore.prosthetics.map(p => p.id))
        const newRecs = data.records.filter(r => !existingIds.has(r.id) && !_deletedIds.has(r.id))
        const newPros = data.prosthetics.filter(p => !existingProsIds.has(p.id) && !_deletedIds.has(p.id))
        if (newRecs.length) recordsStore.records = [...recordsStore.records, ...newRecs]
        if (newPros.length) recordsStore.prosthetics = [...recordsStore.prosthetics, ...newPros]
        patientsStore.invalidatePatientCache()
        saveToCache(uid)
      }
      return true
    } catch (e) {
      console.error('[Search] Records server search failed:', e)
      return false
    }
  }

  /**
   * Initialize background sync processing.
   * Call after user login with the syncHandler that processes queue items.
   */
  function initBackgroundSync(syncHandler) {
    startBackgroundSync(syncHandler)
  }

  /**
   * Stop background sync (call on logout or app destroy).
   */
  function destroyBackgroundSync() {
    stopBackgroundSync()
  }

  return {
    records,
    prosthetics,
    debts,
    appointments,
    config,
    activeTab,
    selectedMonth,
    syncing,
    syncMessage,
    syncProgress,
    currency,
    centerName,
    clinics,
    services,
    payments,
    loadFromCache,
    loadFromCacheAsync,
    saveToCache,
    saveToCacheAsync,
    persistAndSync,
    syncSave,
    syncLoad,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteProsthetic,
    addDebt,
    updateDebt,
    deleteDebt,
    trackDeletion,
    trackDeletionBatch,
    addAppointment,
    removeAppointment,
    updateConfig,
    renameClinic,
    resetState,
    clearLocalData,
    searchFromServer,
    searchDebtsFromServer,
    searchRecordsFromServer,
    loadAllDebts,
    initBackgroundSync,
    destroyBackgroundSync,
  }
})
