/**
 * SQLite Cache Service
 * Uses IndexedDB as cross-platform storage (works on web, Android WebView, Windows)
 * Provides offline-first caching with background sync support
 */

const DB_NAME = 'dental_clinic_db'
const DB_VERSION = 5
const STORES = {
  patients: 'patients',
  appointments: 'appointments',
  debts: 'debts',
  records: 'records',
  prosthetics: 'prosthetics',
  appConfig: 'appConfig',
  thumbnails: 'thumbnails',
  syncQueue: 'syncQueue',
  metadata: 'metadata',
  pendingUploads: 'pendingUploads',
  syncMeta: 'syncMeta',
  xrayFallback: 'xrayFallback',
}

let _db = null

export function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORES.patients)) {
        db.createObjectStore(STORES.patients, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.appointments)) {
        db.createObjectStore(STORES.appointments, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.debts)) {
        db.createObjectStore(STORES.debts, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.thumbnails)) {
        db.createObjectStore(STORES.thumbnails, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true })
        store.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.metadata)) {
        db.createObjectStore(STORES.metadata, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.pendingUploads)) {
        const upStore = db.createObjectStore(STORES.pendingUploads, { keyPath: 'id' })
        upStore.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.syncMeta)) {
        db.createObjectStore(STORES.syncMeta, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.xrayFallback)) {
        db.createObjectStore(STORES.xrayFallback, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.records)) {
        db.createObjectStore(STORES.records, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.prosthetics)) {
        db.createObjectStore(STORES.prosthetics, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.appConfig)) {
        db.createObjectStore(STORES.appConfig, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => {
      _db = request.result
      resolve(_db)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getStore(storeName, mode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Patient Cache ──

export async function cachePatients(patients) {
  const db = await openDB()
  const tx = db.transaction(STORES.patients, 'readwrite')
  const store = tx.objectStore(STORES.patients)
  store.clear()
  for (const p of patients) {
    store.put(p)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedPatients() {
  const store = await getStore(STORES.patients)
  return promisifyRequest(store.getAll())
}

export async function getCachedPatient(id) {
  const store = await getStore(STORES.patients)
  return promisifyRequest(store.get(id))
}

export async function removeCachedPatient(id) {
  const store = await getStore(STORES.patients, 'readwrite')
  return promisifyRequest(store.delete(id))
}

// ── Appointment Cache ──

export async function cacheAppointments(appointments) {
  const db = await openDB()
  const tx = db.transaction(STORES.appointments, 'readwrite')
  const store = tx.objectStore(STORES.appointments)
  store.clear()
  for (const a of appointments) {
    store.put(a)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedAppointments() {
  const store = await getStore(STORES.appointments)
  return promisifyRequest(store.getAll())
}

// ── Debts Cache ──

export async function cacheDebts(debts) {
  const db = await openDB()
  const tx = db.transaction(STORES.debts, 'readwrite')
  const store = tx.objectStore(STORES.debts)
  store.clear()
  for (const d of debts) {
    if (d.id) store.put(d)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedDebts() {
  const store = await getStore(STORES.debts)
  return promisifyRequest(store.getAll())
}

// ── Records Cache ──

export async function cacheRecords(records) {
  const db = await openDB()
  const tx = db.transaction(STORES.records, 'readwrite')
  const store = tx.objectStore(STORES.records)
  store.clear()
  for (const r of records) {
    if (r.id) store.put(r)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedRecords() {
  const store = await getStore(STORES.records)
  return promisifyRequest(store.getAll())
}

// ── Prosthetics Cache ──

export async function cacheProsthetics(prosthetics) {
  const db = await openDB()
  const tx = db.transaction(STORES.prosthetics, 'readwrite')
  const store = tx.objectStore(STORES.prosthetics)
  store.clear()
  for (const p of prosthetics) {
    if (p.id) store.put(p)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedProsthetics() {
  const store = await getStore(STORES.prosthetics)
  return promisifyRequest(store.getAll())
}

// ── App Config Cache ──

export async function cacheConfig(config) {
  const store = await getStore(STORES.appConfig, 'readwrite')
  // Strip reactive proxies / functions / other non-cloneable values so the
  // structured-clone IndexedDB write can't throw DataCloneError (which silently
  // broke offline config persistence, including the patientXrays key map).
  let data = config
  try {
    data = JSON.parse(JSON.stringify(config))
  } catch { /* fall back to the original object */ }
  return promisifyRequest(store.put({ key: 'config', data, ts: Date.now() }))
}

export async function getCachedConfig() {
  const store = await getStore(STORES.appConfig)
  const result = await promisifyRequest(store.get('config'))
  return result?.data || null
}

// ── Thumbnail Cache ──

export async function cacheThumbnail(key, dataUrl) {
  const store = await getStore(STORES.thumbnails, 'readwrite')
  return promisifyRequest(store.put({ key, dataUrl, ts: Date.now() }))
}

export async function getCachedThumbnail(key) {
  const store = await getStore(STORES.thumbnails)
  const result = await promisifyRequest(store.get(key))
  return result?.dataUrl || null
}

export async function removeCachedThumbnail(key) {
  const store = await getStore(STORES.thumbnails, 'readwrite')
  return promisifyRequest(store.delete(key))
}

export async function clearAllThumbnails() {
  const store = await getStore(STORES.thumbnails, 'readwrite')
  return promisifyRequest(store.clear())
}

export async function clearAllXrayFallbacks() {
  const store = await getStore(STORES.xrayFallback, 'readwrite')
  return promisifyRequest(store.clear())
}

// ── Sync Queue (background sync) ──

export async function addSyncAction(action) {
  const store = await getStore(STORES.syncQueue, 'readwrite')
  return promisifyRequest(store.put({
    action: action.type,
    data: action.data,
    status: 'pending',
    ts: Date.now(),
    retries: 0,
  }))
}

export async function getPendingSyncActions() {
  const store = await getStore(STORES.syncQueue)
  const all = await promisifyRequest(store.getAll())
  return all.filter(a => a.status === 'pending')
}

export async function markSyncActionDone(id) {
  const store = await getStore(STORES.syncQueue, 'readwrite')
  return promisifyRequest(store.delete(id))
}

export async function markSyncActionFailed(id) {
  const db = await openDB()
  const tx = db.transaction(STORES.syncQueue, 'readwrite')
  const store = tx.objectStore(STORES.syncQueue)
  const item = await promisifyRequest(store.get(id))
  if (item) {
    item.retries = (item.retries || 0) + 1
    if (item.retries > 5) {
      store.delete(id)
    } else {
      store.put(item)
    }
  }
  return new Promise((resolve) => { tx.oncomplete = resolve })
}

export async function clearSyncQueue() {
  const store = await getStore(STORES.syncQueue, 'readwrite')
  return promisifyRequest(store.clear())
}

// ── Metadata ──

export async function setMeta(key, value) {
  const store = await getStore(STORES.metadata, 'readwrite')
  return promisifyRequest(store.put({ key, value, ts: Date.now() }))
}

export async function getMeta(key) {
  const store = await getStore(STORES.metadata)
  const result = await promisifyRequest(store.get(key))
  return result?.value ?? null
}

// ── Background Sync Processing ──

export async function processSyncQueue(syncFn) {
  const pending = await getPendingSyncActions()
  if (!pending.length) return true

  let allOk = true
  for (const item of pending) {
    try {
      await syncFn(item)
      await markSyncActionDone(item.id)
    } catch {
      await markSyncActionFailed(item.id)
      allOk = false
    }
  }
  return allOk
}

// ── Optimistic Update Helper ──

export function applyOptimistic(storeRef, action, data) {
  if (action === 'add') {
    storeRef.value = [...storeRef.value, data]
  } else if (action === 'update') {
    const idx = storeRef.value.findIndex(r => r.id === data.id)
    if (idx !== -1) {
      const copy = [...storeRef.value]
      copy[idx] = { ...copy[idx], ...data }
      storeRef.value = copy
    }
  } else if (action === 'delete') {
    storeRef.value = storeRef.value.filter(r => r.id !== data.id)
  }
}

// ── X-ray Fallback Store (replaces localStorage for full images) ──

export async function saveXrayFallback(key, dataUrl) {
  const store = await getStore(STORES.xrayFallback, 'readwrite')
  return promisifyRequest(store.put({ key, dataUrl, ts: Date.now() }))
}

export async function getXrayFallback(key) {
  const store = await getStore(STORES.xrayFallback)
  const result = await promisifyRequest(store.get(key))
  return result?.dataUrl || null
}

export async function removeXrayFallback(key) {
  const store = await getStore(STORES.xrayFallback, 'readwrite')
  return promisifyRequest(store.delete(key))
}

// ── Pending Uploads ──

export async function savePendingUpload(item) {
  const store = await getStore(STORES.pendingUploads, 'readwrite')
  return promisifyRequest(store.put(item))
}

export async function getPendingUploads() {
  const store = await getStore(STORES.pendingUploads)
  return promisifyRequest(store.getAll())
}

export async function getPendingUploadById(id) {
  const store = await getStore(STORES.pendingUploads)
  return promisifyRequest(store.get(id))
}

export async function removePendingUpload(id) {
  const store = await getStore(STORES.pendingUploads, 'readwrite')
  return promisifyRequest(store.delete(id))
}

export async function getPendingUploadCount() {
  const store = await getStore(STORES.pendingUploads)
  return promisifyRequest(store.count())
}

export async function clearPendingUploads() {
  const store = await getStore(STORES.pendingUploads, 'readwrite')
  return promisifyRequest(store.clear())
}

// ── DB Cleanup ──

export async function clearAllCaches(preserveMetadata = false) {
  const db = await openDB()
  const storesToClear = preserveMetadata
    ? Object.values(STORES).filter(s => s !== STORES.metadata)
    : Object.values(STORES)
  const tx = db.transaction(storesToClear, 'readwrite')
  for (const name of storesToClear) {
    tx.objectStore(name).clear()
  }
  return new Promise((resolve) => { tx.oncomplete = resolve })
}

export async function initDB() {
  try {
    await openDB()
    return true
  } catch (e) {
    console.warn('[SQLite] IndexedDB init failed, falling back to localStorage:', e)
    return false
  }
}
