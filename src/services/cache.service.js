import { cachePatients, getCachedPatients, cacheAppointments, getCachedAppointments, cacheDebts, getCachedDebts, cacheRecords, getCachedRecords, cacheProsthetics, getCachedProsthetics, cacheConfig, getCachedConfig, clearAllCaches, initDB, setMeta, getMeta } from './sqlite.service'
import { cacheSupabaseData } from './background-sync.service'

const PREFIX = 'dental_'
let _idbReady = false
let _idbReadyPromise = null
let _lastIDBSave = null

export async function initCache() {
  _idbReadyPromise = initDB()
  _idbReady = await _idbReadyPromise
}

export async function waitForCache() {
  if (_idbReady) return true
  if (_idbReadyPromise) { await _idbReadyPromise; return _idbReady }
  return false
}

export async function waitForIDBSave() {
  if (_lastIDBSave) await _lastIDBSave
}

function key(uid, type) {
  return `${PREFIX}${uid}_${type}`
}

export function cacheGet(uid, type) {
  try {
    const raw = localStorage.getItem(key(uid, type))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function cacheSet(uid, type, data) {
  try {
    const k = key(uid, type)
    localStorage.setItem(k, JSON.stringify(data))
    localStorage.setItem(`${k}_ts`, String(Date.now()))
  } catch (e) {
    console.warn('[Cache] Storage full or unavailable:', e)
  }
}

export function getAge(uid, type) {
  try {
    const ts = localStorage.getItem(`${key(uid, type)}_ts`)
    return ts ? Date.now() - Number(ts) : Infinity
  } catch {
    return Infinity
  }
}

export function cacheClear(uid) {
  const prefix = `${PREFIX}${uid}_`
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
}

export function cacheGetAll(uid) {
  return {
    records: cacheGet(uid, 'rec') || [],
    prosthetics: cacheGet(uid, 'pro') || [],
    debts: cacheGet(uid, 'dbt') || [],
    config: cacheGet(uid, 'cfg'),
    appointments: cacheGet(uid, 'appt') || [],
  }
}

export function cacheSaveAll(uid, { records, prosthetics, debts, config, appointments }) {
  if (config) cacheSet(uid, 'cfg', config)
  if (debts) cacheSet(uid, 'dbt', debts)
  if (appointments) cacheSet(uid, 'appt', appointments)
  try {
    if (records && records.length <= 2000) cacheSet(uid, 'rec', records)
    if (prosthetics && prosthetics.length <= 2000) cacheSet(uid, 'pro', prosthetics)
  } catch { /* localStorage full — IDB is the primary store */ }
  saveIDBOwner(uid).catch(() => {})

  if (_idbReady) {
    // Save ALL data to IndexedDB for offline-first
    const _idbSaves = []
    if (records) _idbSaves.push(cacheRecords(records).catch(e => { console.error('[Cache] IDB records save failed:', e); return { _failed: true } }))
    if (prosthetics) _idbSaves.push(cacheProsthetics(prosthetics).catch(e => { console.error('[Cache] IDB prosthetics save failed:', e); return { _failed: true } }))
    if (debts) _idbSaves.push(cacheDebts(debts).catch(e => { console.error('[Cache] IDB debts save failed:', e); return { _failed: true } }))
    if (appointments) _idbSaves.push(cacheAppointments(appointments).catch(e => { console.error('[Cache] IDB appointments save failed:', e); return { _failed: true } }))
    if (config) _idbSaves.push(cacheConfig(config).catch(e => { console.error('[Cache] IDB config save failed:', e); return { _failed: true } }))
    // Return the promise so callers can await IDB persistence if needed
    if (_idbSaves.length) {
      _lastIDBSave = Promise.allSettled(_idbSaves)
    }

    // Build patient index from records
    const patientMap = new Map()
    const allRecs = [...(records || []), ...(prosthetics || [])]
    for (const r of allRecs) {
      if (!r.name) continue
      const existing = patientMap.get(r.name) || { id: r.name, name: r.name, records: [], lastVisit: null }
      existing.records.push(r.id)
      if (!existing.lastVisit || r.date > existing.lastVisit) existing.lastVisit = r.date
      patientMap.set(r.name, existing)
    }
    cachePatients([...patientMap.values()]).catch(() => {})
  }

  // Also populate the new repository layer (non-blocking, safe to fail)
  cacheSupabaseData({ records, prosthetics, appointments }).catch(() => {})
}

export async function getCachedPatientsFromDB() {
  if (!_idbReady) return []
  try {
    return await getCachedPatients()
  } catch {
    return []
  }
}

export async function getCachedAppointmentsFromDB() {
  if (!_idbReady) return []
  try {
    return await getCachedAppointments()
  } catch {
    return []
  }
}

export async function getCachedDebtsFromDB() {
  if (!_idbReady) return []
  try {
    return await getCachedDebts()
  } catch {
    return []
  }
}

export async function getCachedRecordsFromDB() {
  if (!_idbReady) return []
  try {
    return await getCachedRecords()
  } catch {
    return []
  }
}

export async function getCachedProstheticsFromDB() {
  if (!_idbReady) return []
  try {
    return await getCachedProsthetics()
  } catch {
    return []
  }
}

export async function getCachedConfigFromDB() {
  if (!_idbReady) return null
  try {
    return await getCachedConfig()
  } catch {
    return null
  }
}

/**
 * Save current uid to IndexedDB metadata for cross-session verification.
 */
export async function saveIDBOwner(uid) {
  if (!_idbReady && _idbReadyPromise) await _idbReadyPromise
  if (!_idbReady || !uid) return
  try { await setMeta('owner_uid', uid) } catch { /* ignore */ }
}

/**
 * Get stored uid from IndexedDB metadata.
 */
export async function getIDBOwner() {
  if (!_idbReady && _idbReadyPromise) await _idbReadyPromise
  if (!_idbReady) return null
  try { return await getMeta('owner_uid') } catch { return null }
}

/**
 * Clear all IndexedDB caches (preserves metadata store).
 */
export async function clearIDB() {
  if (!_idbReady && _idbReadyPromise) await _idbReadyPromise
  if (!_idbReady) return
  try { await clearAllCaches(true) } catch (e) { console.warn('[Cache] clearIDB failed:', e) }
}

/**
 * Verify IndexedDB data belongs to the given uid. If not, clear everything.
 * Returns true if data was cleared (uid mismatch), false if ok.
 */
export async function verifyIDBOwnership(uid) {
  if (!uid) return false
  const storedUid = await getIDBOwner()
  if (storedUid && storedUid === uid) return false
  console.warn('[Cache] IDB owner mismatch — stored:', storedUid, 'current:', uid, '→ clearing')
  await clearIDB()
  await saveIDBOwner(uid)
  return true
}

export async function loadAllFromIDB() {
  if (!_idbReady && _idbReadyPromise) await _idbReadyPromise
  if (!_idbReady) return null
  try {
    const [records, prosthetics, debts, appointments, config] = await Promise.all([
      getCachedRecords().catch(() => []),
      getCachedProsthetics().catch(() => []),
      getCachedDebts().catch(() => []),
      getCachedAppointments().catch(() => []),
      getCachedConfig().catch(() => null),
    ])
    if (!records.length && !prosthetics.length && !debts.length && !appointments.length && !config) {
      return null
    }
    return { records, prosthetics, debts, appointments, config }
  } catch {
    return null
  }
}

// ── Patient Photo Storage (IndexedDB) ──

const PHOTO_DB_NAME = '_dental_photos'
const PHOTO_STORE = 'photos'

function _openPhotoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getPatientPhotoFromStorage(name) {
  try {
    const lsVal = localStorage.getItem(`dental_photo_${name}`)
    if (lsVal) {
      savePatientPhotoToStorage(name, lsVal).catch(() => {})
      try { localStorage.removeItem(`dental_photo_${name}`) } catch { /* ignore */ }
      return lsVal
    }
    const db = await _openPhotoDB()
    const tx = db.transaction(PHOTO_STORE, 'readonly')
    const req = tx.objectStore(PHOTO_STORE).get(name)
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.data || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function savePatientPhotoToStorage(name, dataUrl) {
  try {
    const db = await _openPhotoDB()
    const tx = db.transaction(PHOTO_STORE, 'readwrite')
    tx.objectStore(PHOTO_STORE).put({ id: name, data: dataUrl })
    await new Promise((resolve) => { tx.oncomplete = resolve })
    try { localStorage.removeItem(`dental_photo_${name}`) } catch { /* ignore */ }
  } catch {
    console.warn('[Cache] Cannot save patient photo to IndexedDB')
  }
}
