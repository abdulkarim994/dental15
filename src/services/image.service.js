import { ref } from 'vue'
import { r2Url, fetchImageSecure, fetchImageBlob, uploadImage, deleteImage, compressImage, createThumbnail } from './r2.service'
import { saveThumbnailToIDB, getThumbnailFromIDB, removeThumbnailFromIDB } from './image-pipeline.service'
import { saveXrayFallback, getXrayFallback, removeXrayFallback, clearAllThumbnails, clearAllXrayFallbacks, savePendingUpload, getPendingUploads, getPendingUploadById, removePendingUpload, getPendingUploadCount, clearPendingUploads } from './sqlite.service'
import { isOnline, checkConnectivity } from './offline-queue'
import { compressInWorker } from '@/workers/compress-bridge'

/**
 * Phase 2 — Adaptive compression that runs OFF the main thread via a Web
 * Worker (OffscreenCanvas) when available, and transparently falls back to
 * the existing main-thread `compressImage` when it is not. Output is a JPEG
 * Blob in both cases, so this is a drop-in, non-breaking replacement that
 * stops freezing the UI while large X-ray images are processed.
 */
async function compressAdaptive(file, maxWidth, quality) {
  try {
    const out = await compressInWorker(file, maxWidth, quality)
    if (out && out.size) return out
  } catch { /* worker unavailable/failed — fall through */ }
  return compressImage(file, maxWidth, quality)
}

// Reactive version counter — increment to trigger Vue re-renders when thumbnails load
export const xrayVersion = ref(0)

const _imageCache = new Map()
const _thumbPromises = new Map() // Async thumbnail resolution cache
// Phase 3 — keep memory low on app open. Thumbnails are tiny so we allow many,
// but full-size data URLs are heavy, so they are capped much lower to avoid
// OOM-style slowdowns/crashes when opening accounts with many X-rays.
const MAX_CACHE_SIZE = 120
const MAX_FULL_CACHE = 12

function _isThumbKey(k) {
  return typeof k === 'string' && k.startsWith('thumb:')
}

function _evictVal(key) {
  const val = _imageCache.get(key)
  if (val && typeof val === 'string' && val.startsWith('blob:')) {
    _revokeTrackedBlob(val)
  }
  _imageCache.delete(key)
}

function evictOldest() {
  // 1) Cap heavy full-size entries first (non-thumb keys).
  let fullCount = 0
  for (const k of _imageCache.keys()) {
    if (!_isThumbKey(k)) fullCount++
  }
  if (fullCount > MAX_FULL_CACHE) {
    for (const k of _imageCache.keys()) {
      if (fullCount <= MAX_FULL_CACHE) break
      if (!_isThumbKey(k)) {
        _evictVal(k)
        fullCount--
      }
    }
  }
  // 2) Enforce overall size as a safety net.
  while (_imageCache.size > MAX_CACHE_SIZE) {
    const oldest = _imageCache.keys().next().value
    if (oldest === undefined) break
    _evictVal(oldest)
  }
}

export function getCachedImageUrl(key) {
  return _imageCache.get(key)
}

export function getImageUrl(key) {
  if (_imageCache.has(key)) return _imageCache.get(key)
  const localData = getLocalXrayData(key)
  if (localData) {
    _imageCache.set(key, localData)
    evictOldest()
    return localData
  }
  // Async load: check IndexedDB first, then fetch secure blob (no token in URL)
  getLocalXrayDataAsync(key).then(idbData => {
    if (idbData) {
      _imageCache.set(key, idbData)
      _generateThumbIfMissing(key, idbData)
      xrayVersion.value++
      return
    }
    return fetchImageBlob(key).then(async blob => {
      if (!blob) return
      // Persist a compressed copy to IDB immediately so it survives app
      // close/minimize until logout, then cache the durable data URL.
      try {
        const compressedBlob = await compressImage(blob, 1600, 0.7).catch(() => blob)
        const dataUrl = await fileToDataUrl(compressedBlob)
        await saveLocalXrayData(key, dataUrl)
        _imageCache.set(key, dataUrl)
        _generateThumbIfMissing(key, dataUrl)
        xrayVersion.value++
      } catch {
        // Persisting failed — still show this session via an ephemeral blob URL.
        const blobUrl = URL.createObjectURL(blob)
        _imageCache.set(key, blobUrl)
        _trackBlob(blobUrl)
        _generateThumbIfMissing(key, blobUrl)
        xrayVersion.value++
      }
    })
  }).catch(() => {})
  return ''
}

async function _generateThumbIfMissing(key, srcUrl) {
  if (_imageCache.has(`thumb:${key}`)) return
  try {
    const res = await fetch(srcUrl)
    const blob = await res.blob()
    const thumbBlob = await compressThumbnailToSize(blob, 200)
    if (thumbBlob) {
      const thumbDataUrl = await fileToDataUrl(thumbBlob)
      await saveThumbnailData(key, thumbDataUrl).catch(() => {})
      _imageCache.set(`thumb:${key}`, thumbDataUrl)
      _failedKeys.delete(key)
      xrayVersion.value++
    }
  } catch { /* ignore */ }
}

function fileToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function saveLocalXrayData(key, dataUrl) {
  try {
    await saveXrayFallback(key, dataUrl)
  } catch (e) {
    console.warn('[Image] IndexedDB xrayFallback write failed:', e.message)
  }
}

function getLocalXrayData(key) {
  return null
}

async function getLocalXrayDataAsync(key) {
  try {
    return await getXrayFallback(key)
  } catch {
    return null
  }
}

async function removeLocalXrayData(key) {
  try { await removeXrayFallback(key) } catch { /* ignore */ }
}

async function saveThumbnailData(key, dataUrl) {
  await saveThumbnailToIDB(key, dataUrl)
}

function getThumbnailData(key) {
  return null
}

/**
 * Async thumbnail resolver — checks IndexedDB if localStorage miss.
 * Returns a promise. Components should use this for progressive loading.
 */
export async function getThumbnailAsync(key) {
  // Check in-flight resolution
  if (_thumbPromises.has(key)) return _thumbPromises.get(key)

  const promise = (async () => {
    // 1. Memory cache
    const cached = _imageCache.get(`thumb:${key}`)
    if (cached) return cached

    // 2. localStorage (sync, fast)
    const lsData = getThumbnailData(key)
    if (lsData) {
      _imageCache.set(`thumb:${key}`, lsData)
      return lsData
    }

    // 3. IndexedDB (async, larger capacity)
    const idbData = await getThumbnailFromIDB(key)
    if (idbData) {
      _imageCache.set(`thumb:${key}`, idbData)
      evictOldest()
      return idbData
    }

    // 4. Fallback to full image URL
    return null
  })().finally(() => {
    _thumbPromises.delete(key)
  })

  _thumbPromises.set(key, promise)
  return promise
}

function removeThumbnailData(key) {
  removeThumbnailFromIDB(key).catch(() => {})
}

// ── Blob URL tracking (memory leak prevention) ──

const _trackedBlobs = new Set()

function _trackBlob(url) {
  if (url && url.startsWith('blob:')) _trackedBlobs.add(url)
}

function _revokeTrackedBlob(url) {
  if (_trackedBlobs.has(url)) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
    _trackedBlobs.delete(url)
  }
}

export function revokeAllImageBlobs() {
  for (const url of _trackedBlobs) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  _trackedBlobs.clear()
}

export function getTrackedBlobCount() {
  return _trackedBlobs.size
}

/**
 * Clear the "failed" flags for thumbnails so the next render re-attempts a
 * restore from R2. Called when the app regains focus or connectivity — this
 * is what turns a stale red "broken image" icon back into a real thumbnail
 * once the network/token becomes available again.
 */
export function retryFailedThumbnails() {
  if (!_failedKeys.size && !_retryCount.size) {
    xrayVersion.value++
    return
  }
  _failedKeys.clear()
  _retryCount.clear()
  xrayVersion.value++
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _trackedBlobs.size > MAX_CACHE_SIZE) {
      const excess = _trackedBlobs.size - MAX_CACHE_SIZE
      const toRevoke = [..._trackedBlobs].slice(0, excess)
      for (const url of toRevoke) {
        try { URL.revokeObjectURL(url) } catch { /* ignore */ }
        _trackedBlobs.delete(url)
        // FIX: remove dead blob URLs from memory cache so they trigger re-fetch on next access
        for (const [k, v] of _imageCache) {
          if (v === url) _imageCache.delete(k)
        }
      }
    }
    // FIX: when app returns to foreground, re-evaluate image sources AND clear any
    // stale failure flags so thumbnails that failed while backgrounded/offline retry.
    if (document.visibilityState === 'visible') {
      retryFailedThumbnails()
    }
  })
}

if (typeof window !== 'undefined') {
  // When connectivity returns, drop failure flags so broken thumbnails retry from R2.
  window.addEventListener('online', () => {
    retryFailedThumbnails()
  })
}

// On native (Capacitor) Android the WebView is paused, not just hidden — the
// `visibilitychange` event is not always reliable. Hook the App resume event so
// returning to the foreground re-attempts any failed restores.
if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) retryFailedThumbnails()
    })
    App.addListener('resume', () => retryFailedThumbnails())
  }).catch(() => { /* plugin unavailable — visibilitychange still covers web */ })
}

/**
 * Awaitable, persistent full-image resolver used by the viewer.
 * Order: in-memory cache → IndexedDB (xrayFallback) → R2 (then saved to IDB so
 * it survives app minimize/close until logout). Returns a URL string or ''.
 * Unlike getImageUrl (fire-and-forget) this lets the UI await a definite result
 * and show a retry affordance instead of an endless spinner.
 */
export async function getImagePersistent(key) {
  if (!key) return ''
  if (typeof key === 'string' && (key.startsWith('http') || key.startsWith('data:'))) return key
  if (_imageCache.has(key)) return _imageCache.get(key)

  const idbData = await getLocalXrayDataAsync(key)
  if (idbData) {
    _imageCache.set(key, idbData)
    _generateThumbIfMissing(key, idbData)
    return idbData
  }

  const blob = await fetchImageBlob(key)
  if (!blob) return ''
  try {
    const compressedBlob = await compressImage(blob, 1600, 0.7).catch(() => blob)
    const dataUrl = await fileToDataUrl(compressedBlob)
    await saveLocalXrayData(key, dataUrl)
    _generateThumbIfMissing(key, dataUrl)
    _failedKeys.delete(key)
    _retryCount.delete(key)
    _imageCache.set(key, dataUrl)
    return dataUrl
  } catch {
    // Persisting failed but we can still show this session via a blob URL.
    const blobUrl = URL.createObjectURL(blob)
    _trackBlob(blobUrl)
    _imageCache.set(key, blobUrl)
    return blobUrl
  }
}

export function getThumbnailUrl(key) {
  // Check thumbnail cache first
  const memCached = _imageCache.get(`thumb:${key}`)
  if (memCached) return memCached

  // Fall back to full image if cached (better than showing nothing)
  const fullCached = _imageCache.get(key)
  if (fullCached) {
    _generateThumbIfMissing(key, fullCached)
    return fullCached
  }

  // If this key was previously marked failed but we are back online, give it a
  // fresh chance instead of leaving a permanent red icon.
  if (typeof navigator !== 'undefined' && navigator.onLine && _failedKeys.has(key)) {
    _failedKeys.delete(key)
    _retryCount.delete(key)
  }

  // Trigger background restore from R2 (on-demand)
  restoreThumbnailFromR2(key)
  return ''
}

/**
 * Compress a thumbnail to fit within maxSizeKB.
 */
async function compressThumbnailToSize(file, maxSizeKB = 200) {
  let width = 300
  let quality = 0.7
  let blob = await compressImage(file, width, quality)
  if (!blob || blob.size <= maxSizeKB * 1024) return blob
  // Reduce quality progressively
  for (const q of [0.5, 0.4, 0.3]) {
    blob = await compressImage(file, width, q)
    if (blob && blob.size <= maxSizeKB * 1024) return blob
  }
  // Reduce dimensions further
  for (const w of [200, 150]) {
    blob = await compressImage(file, w, 0.3)
    if (blob && blob.size <= maxSizeKB * 1024) return blob
  }
  return blob
}

// ── Pending uploads counter (reactive) ──
export const pendingUploadCount = ref(0)

let _uploadQueueRunning = false
let _retryInterval = null
let _onlineListener = null

// The R2 worker assigns its own object key on upload (it normalizes/ignores the
// key we send), so a queued offline upload lands under a different key than the
// temp key the patient config references. This handler lets the app remap the
// config (tempKey -> server key) once the real upload completes.
let _keyRemapHandler = null
export function setXrayKeyRemapHandler(fn) {
  _keyRemapHandler = typeof fn === 'function' ? fn : null
}

export async function refreshPendingCount() {
  try {
    pendingUploadCount.value = await getPendingUploadCount()
  } catch {
    pendingUploadCount.value = 0
  }
}

async function _tryUploadToR2(compressedDataUrl, key, patientName, fileName) {
  let blob
  try {
    if (compressedDataUrl.startsWith('data:')) {
      const parts = compressedDataUrl.split(',')
      const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg'
      const binary = atob(parts[1])
      const arr = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
      blob = new Blob([arr], { type: mime })
    } else {
      const res = await fetch(compressedDataUrl)
      blob = await res.blob()
    }
  } catch (e) {
    throw new Error('Failed to prepare image: ' + e.message)
  }
  const result = await uploadImage(blob, key, patientName, fileName)
  return result?.key || result?.Key || result?.path || key
}

async function _isReallyOnline() {
  if (!isOnline()) {
    const ok = await checkConnectivity()
    return ok
  }
  return true
}

/**
 * Perform a REAL upload of one pending item to R2, then reconcile local state:
 * the R2 worker assigns its own object key (it ignores the temp key we queued
 * with), so we persist the bytes under that real key, remap the patient config
 * (tempKey -> server key) and only then drop the pending item. Throws if the
 * network upload fails so the caller keeps the item for a later retry.
 * Returns true when the item was fully reconciled and removed from the queue.
 */
async function _reconcilePendingItem(item) {
  // The upload returns the authoritative key the R2 worker stored the object
  // under — it differs from the temp key we queued with.
  const serverKey = await _tryUploadToR2(item.compressedDataUrl, item.id, item.patientName, item.fileName)
  const storageKey = serverKey || item.id

  // Persist the bytes under the real storage key so offline display and other
  // devices resolve the same object that is now on R2.
  try {
    await saveLocalXrayData(storageKey, item.compressedDataUrl)
  } catch { /* ignore */ }
  try {
    const hasThumb = await getThumbnailFromIDB(storageKey).catch(() => null)
    if (!hasThumb) {
      const pBlob = await (await fetch(item.compressedDataUrl)).blob()
      const thumbBlob = await compressThumbnailToSize(pBlob, 200)
      if (thumbBlob) {
        const thumbDataUrl = await fileToDataUrl(thumbBlob)
        await saveThumbnailData(storageKey, thumbDataUrl)
        _imageCache.set(`thumb:${storageKey}`, thumbDataUrl)
      }
    }
  } catch { /* ignore */ }
  _imageCache.set(storageKey, item.compressedDataUrl)

  // Remap the patient config from the temp key to the real key. If the remap
  // can't be applied we keep the pending item so we never leave the config
  // pointing at a key that 404s on other devices.
  let remapOk = true
  if (storageKey !== item.id) {
    // A remap is REQUIRED here (the server stored the object under a different
    // key than the temp key the patient config references). We must only treat
    // this item as done — and only delete the local temp-key bytes — once the
    // config has actually been remapped. Otherwise the image would be deleted
    // while the config still points at the dead temp key, making it vanish.
    remapOk = false
    if (_keyRemapHandler) {
      try {
        await _keyRemapHandler(item.id, storageKey)
        remapOk = true
      } catch (e) {
        console.warn('[Image] key remap failed, will retry:', item.id, e?.message)
      }
    } else {
      // No handler registered yet — keep the pending item and the local image
      // intact so nothing is lost; it will be reconciled on a later pass.
      console.warn('[Image] no key remap handler registered; keeping pending item:', item.id)
    }
    if (remapOk) {
      _imageCache.delete(item.id)
      _imageCache.delete(`thumb:${item.id}`)
      removeXrayFallback(item.id).catch(() => {})
      removeThumbnailFromIDB(item.id).catch(() => {})
    }
  }

  if (remapOk) {
    await removePendingUpload(item.id)
    await refreshPendingCount()
    xrayVersion.value++
    return true
  }
  return false
}

async function _processUploadQueue() {
  if (_uploadQueueRunning) return
  if (!isOnline() && navigator.onLine === false) return
  _uploadQueueRunning = true

  try {
    const pending = await getPendingUploads()
    if (!pending.length) return
    if (!(await _isReallyOnline())) return
    for (const item of pending) {
      if (!isOnline() && navigator.onLine === false) break
      // Validate that the pending upload data is still intact
      if (!item.compressedDataUrl || typeof item.compressedDataUrl !== 'string' || item.compressedDataUrl.length < 100) {
        console.warn('[Image] Corrupt pending upload data, removing:', item.id)
        await removePendingUpload(item.id)
        await refreshPendingCount()
        continue
      }
      try {
        const done = await _reconcilePendingItem(item)
        if (!done) console.warn('[Image] Keeping pending upload for retry:', item.id)
      } catch (err) {
        console.warn('[Image] Pending upload failed, will retry:', item.id, err.message)
      }
    }
  } catch (e) {
    console.warn('[Image] Upload queue processing error:', e)
  } finally {
    _uploadQueueRunning = false
  }
}

export function startUploadQueueListener() {
  if (_onlineListener) return
  _onlineListener = () => {
    setTimeout(() => _processUploadQueue(), 2000)
  }
  window.addEventListener('online', _onlineListener)
  _processUploadQueue()
  if (!_retryInterval) {
    _retryInterval = setInterval(() => { _processUploadQueue() }, 30000)
  }
}

export function stopUploadQueueListener() {
  if (_onlineListener) {
    window.removeEventListener('online', _onlineListener)
    _onlineListener = null
  }
  if (_retryInterval) {
    clearInterval(_retryInterval)
    _retryInterval = null
  }
}

const MAX_FILE_SIZE_MB = 25

export async function uploadXrayImage(file, patientName, uid) {
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(`\u062d\u062c\u0645 \u0627\u0644\u0645\u0644\u0641 (${fileSizeMB.toFixed(1)} MB) \u064a\u062a\u062c\u0627\u0648\u0632 \u0627\u0644\u062d\u062f \u0627\u0644\u0645\u0633\u0645\u0648\u062d (${MAX_FILE_SIZE_MB} MB)`)
  }

  const tempKey = `xray/${uid}/${patientName}/${Date.now()}_${file.name}`

  // 1. Compress full image
  let compressed
  try {
    const sizeMB = file.size / (1024 * 1024)
    let maxWidth, quality
    if (sizeMB > 10) {
      maxWidth = 1200; quality = 0.5
    } else if (sizeMB > 5) {
      maxWidth = 1600; quality = 0.6
    } else if (sizeMB > 2) {
      maxWidth = 1800; quality = 0.7
    } else {
      maxWidth = 2000; quality = 0.8
    }
    compressed = await compressAdaptive(file, maxWidth, quality)
    if (compressed && compressed.size >= file.size) {
      compressed = file
    }
  } catch {
    compressed = file
  }

  // 2. Save compressed image to IndexedDB FIRST (offline-first)
  let compressedDataUrl
  try {
    compressedDataUrl = await fileToDataUrl(compressed)
    if (compressedDataUrl && compressedDataUrl.startsWith('data:')) {
      await saveLocalXrayData(tempKey, compressedDataUrl)
      _imageCache.set(tempKey, compressedDataUrl)
      // Verify the data was actually saved by reading it back
      const verify = await getLocalXrayDataAsync(tempKey)
      if (!verify) {
        console.warn('[Image] IndexedDB write verification failed for:', tempKey)
      }
    }
  } catch (e) {
    console.warn('[Image] Failed to save to IndexedDB:', e.message)
  }

  // 3. Compress thumbnail and save to IndexedDB
  try {
    const thumbBlob = await compressThumbnailToSize(file, 200)
    if (thumbBlob) {
      const thumbDataUrl = await fileToDataUrl(thumbBlob)
      await saveThumbnailData(tempKey, thumbDataUrl)
      _imageCache.set(`thumb:${tempKey}`, thumbDataUrl)
    }
  } catch (err) {
    console.warn('[Image] Thumbnail creation failed:', err.message)
  }

  // 4. Try uploading to R2 if online
  let finalKey = tempKey
  let queued = false
  if (navigator.onLine !== false) {
    try {
      const result = await uploadImage(compressed, tempKey, patientName, file.name)
      const serverKey = result?.key || result?.Key || result?.path
      if (serverKey) finalKey = serverKey

      // Update IndexedDB keys if server returned a different key
      if (finalKey !== tempKey) {
        if (compressedDataUrl) {
          await saveLocalXrayData(finalKey, compressedDataUrl)
          _imageCache.set(finalKey, compressedDataUrl)
        }
        const thumbData = _imageCache.get(`thumb:${tempKey}`)
        if (thumbData) {
          await saveThumbnailData(finalKey, thumbData).catch(() => {})
          _imageCache.set(`thumb:${finalKey}`, thumbData)
        }
      }
    } catch (err) {
      console.warn('[Image] R2 upload failed, queuing for later:', err.message)
      // Queue for later upload
      queued = true
      if (compressedDataUrl) {
        await savePendingUpload({
          id: tempKey,
          compressedDataUrl,
          patientName,
          fileName: file.name,
          uid,
          ts: Date.now(),
        })
        await refreshPendingCount()
      }
    }
  } else {
    // Offline — queue for later
    queued = true
    if (compressedDataUrl) {
      await savePendingUpload({
        id: tempKey,
        compressedDataUrl,
        patientName,
        fileName: file.name,
        uid,
        ts: Date.now(),
      })
      await refreshPendingCount()
    }
  }

  return { key: finalKey, queued }
}

/**
 * Load an image securely via Authorization header instead of token-in-URL.
 * Returns a blob URL. Falls back to r2Url if the secure fetch fails.
 * Use this for sensitive image contexts where URL leakage is a concern.
 */
export async function getImageSecure(key) {
  if (_imageCache.has(`secure:${key}`)) return _imageCache.get(`secure:${key}`)
  const localData = await getLocalXrayDataAsync(key)
  if (localData) return localData
  const blobUrl = await fetchImageSecure(key)
  if (blobUrl) {
    _imageCache.set(`secure:${key}`, blobUrl)
    _trackBlob(blobUrl)
    evictOldest()
  }
  return blobUrl || ''
}

export async function deleteXrayImage(key) {
  // Revoke any tracked blob URLs for this key
  const cachedUrl = _imageCache.get(key)
  if (cachedUrl) _revokeTrackedBlob(cachedUrl)
  const secureUrl = _imageCache.get(`secure:${key}`)
  if (secureUrl) _revokeTrackedBlob(secureUrl)

  _imageCache.delete(key)
  _imageCache.delete(`secure:${key}`)
  _imageCache.delete(`thumb:${key}`)
  await removeLocalXrayData(key)
  removeThumbnailData(key)
  try {
    await deleteImage(key)
  } catch {
    // R2 delete failed silently — local already removed
  }
}

/**
 * Clear all local thumbnails and xray data (call on logout).
 */
export async function clearXrayLocalData() {
  // DATA SAFETY: pending uploads are images that exist ONLY on this device (not yet
  // on R2). Before wiping local data on logout we must flush them to the server,
  // otherwise they are lost forever. If we are offline (or some uploads still fail)
  // we KEEP the unsynced pending uploads so the images survive — integrity of a
  // medical x-ray outweighs clearing it for privacy. Everything that is already on
  // R2 is removed locally as expected.
  try {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      await uploadAllPending()
    }
  } catch { /* best effort — unsynced items stay in the pending store below */ }

  try { await clearAllThumbnails() } catch { /* ignore */ }
  try { await clearAllXrayFallbacks() } catch { /* ignore */ }
  // Only clear the pending store if everything was successfully synced to R2.
  try {
    const remaining = await getPendingUploadCount()
    if (remaining === 0) await clearPendingUploads()
  } catch { /* ignore */ }
  await refreshPendingCount().catch(() => { pendingUploadCount.value = 0 })

  _imageCache.clear()
  revokeAllImageBlobs()
  // FIX: clear all module-level state so the next login session starts clean
  _restoring.clear()
  _failedKeys.clear()
  _retryCount.clear()
  _thumbPromises.clear()
  xrayVersion.value = 0
}

// Track in-flight restore operations to avoid duplicates
const _restoring = new Set()
const _failedKeys = new Map()
const _retryCount = new Map()
const MAX_RETRIES = 5
export function isXrayFailed(key) {
  const k = typeof key === 'string' ? key : key?.key
  if (!k || !_failedKeys.has(k)) return false
  // If we have a thumbnail in cache, don't report as failed
  if (_imageCache.has(`thumb:${k}`)) return false
  // Allow retry after 5 seconds
  if (Date.now() - _failedKeys.get(k) > 5000) {
    _failedKeys.delete(k)
    return false
  }
  return true
}

function _markRetryable(key) {
  const count = (_retryCount.get(key) || 0) + 1
  _retryCount.set(key, count)
  if (count >= MAX_RETRIES) {
    _failedKeys.set(key, Date.now())
    xrayVersion.value++
  } else {
    // Schedule retry after increasing delay
    setTimeout(() => {
      _restoring.delete(key)
      restoreThumbnailFromR2(key)
    }, count * 3000)
  }
}

/**
 * Restore thumbnail and compressed image from R2 on-demand in background.
 * Triggers Vue reactivity via xrayVersion when data becomes available.
 * Falls back to pending uploads data if IndexedDB and R2 both fail.
 */
export function restoreThumbnailFromR2(key) {
  if (_imageCache.has(`thumb:${key}`) && _imageCache.has(key)) return
  if (_restoring.has(key)) return
  _restoring.add(key)

  ;(async () => {
    let hasThumb = false
    let hasFull = false

    // 1. Check IndexedDB first (fast path)
    const idbThumb = await getThumbnailFromIDB(key).catch(() => null)
    if (idbThumb) {
      _imageCache.set(`thumb:${key}`, idbThumb)
      _failedKeys.delete(key)
      _retryCount.delete(key)
      hasThumb = true
    }
    const idbFull = await getLocalXrayDataAsync(key)
    if (idbFull) {
      _imageCache.set(key, idbFull)
      hasFull = true
    }

    // If we have the thumbnail, render immediately
    if (hasThumb) {
      xrayVersion.value++
      if (hasFull) {
        _restoring.delete(key)
        return
      }
    }

    // 1b. If full image exists locally but no thumbnail, generate thumbnail from it
    if (!hasThumb && hasFull) {
      try {
        const localRes = await fetch(idbFull)
        const localBlob = await localRes.blob()
        const thumbBlob = await compressThumbnailToSize(localBlob, 200)
        if (thumbBlob) {
          const thumbDataUrl = await fileToDataUrl(thumbBlob)
          await saveThumbnailData(key, thumbDataUrl).catch(() => {})
          _imageCache.set(`thumb:${key}`, thumbDataUrl)
          _failedKeys.delete(key)
          _retryCount.delete(key)
          hasThumb = true
          xrayVersion.value++
          _restoring.delete(key)
          return
        }
      } catch { /* fall through */ }
    }

    // 1c. Check pending uploads as fallback (image data stored there during offline upload)
    if (!hasThumb && !hasFull) {
      try {
        const pending = await getPendingUploadById(key)
        if (pending?.compressedDataUrl && pending.compressedDataUrl.startsWith('data:')) {
          _imageCache.set(key, pending.compressedDataUrl)
          hasFull = true
          // Save to xrayFallback for future use
          await saveLocalXrayData(key, pending.compressedDataUrl).catch(() => {})
          // Generate thumbnail from it
          try {
            const pRes = await fetch(pending.compressedDataUrl)
            const pBlob = await pRes.blob()
            const thumbBlob = await compressThumbnailToSize(pBlob, 200)
            if (thumbBlob) {
              const thumbDataUrl = await fileToDataUrl(thumbBlob)
              await saveThumbnailData(key, thumbDataUrl).catch(() => {})
              _imageCache.set(`thumb:${key}`, thumbDataUrl)
              hasThumb = true
            }
          } catch { /* ignore */ }
          _failedKeys.delete(key)
          _retryCount.delete(key)
          xrayVersion.value++
          _restoring.delete(key)
          return
        }
      } catch { /* ignore */ }
    }

    // 2. If offline, stop here — don't try R2
    if (!navigator.onLine) {
      if (hasThumb) {
        // Already showing thumbnail, nothing more to do offline
      } else if (!hasThumb && !hasFull) {
        _failedKeys.set(key, Date.now())
        xrayVersion.value++
      }
      _restoring.delete(key)
      return
    }

    // 3. Fetch from R2 (online only)
    try {
      const blob = await fetchImageBlob(key)
      if (!blob) {
        if (!hasThumb) _markRetryable(key)
        _restoring.delete(key)
        return
      }

      // Generate and save thumbnail
      if (!hasThumb) {
        try {
          const thumbBlob = await compressThumbnailToSize(blob, 200)
          if (thumbBlob) {
            const thumbDataUrl = await fileToDataUrl(thumbBlob)
            await saveThumbnailData(key, thumbDataUrl).catch(() => {})
            _imageCache.set(`thumb:${key}`, thumbDataUrl)
            _failedKeys.delete(key)
            _retryCount.delete(key)
          }
        } catch { /* ignore */ }
      }

      // Save compressed image locally for offline use
      if (!hasFull) {
        try {
        const compressedBlob = await compressAdaptive(blob, 1600, 0.7).catch(() => blob)
          const compressedDataUrl = await fileToDataUrl(compressedBlob)
          await saveLocalXrayData(key, compressedDataUrl).catch(() => {})
          _imageCache.set(key, compressedDataUrl)
        } catch { /* ignore */ }
      }

      xrayVersion.value++
    } catch {
      if (!hasThumb) _markRetryable(key)
    }
    _restoring.delete(key)
  })()
}

/**
 * Preload thumbnails for a list of xray keys.
 * Triggers restoreThumbnailFromR2 for each key so thumbnails
 * are loaded into cache and xrayVersion increments trigger re-renders.
 */
export function preloadThumbnails(keys) {
  if (!keys || !keys.length) return
  for (const raw of keys) {
    const key = typeof raw === 'string' ? raw : raw?.key
    if (key) restoreThumbnailFromR2(key)
  }
}

// ── Public API for pending uploads management ──

export async function getUploadQueue() {
  return getPendingUploads()
}

export async function uploadSinglePending(item) {
  // Guard: never claim a successful upload while there is no real connection.
  // This also prevents the pending item (and its local image) from being
  // touched when the device is offline.
  if (!(await _isReallyOnline())) {
    throw new Error('offline')
  }
  // Guard: skip corrupt/empty payloads instead of silently "succeeding".
  if (!item || !item.compressedDataUrl || typeof item.compressedDataUrl !== 'string' || item.compressedDataUrl.length < 100) {
    throw new Error('invalid-pending-item')
  }
  // _reconcilePendingItem returns true ONLY when the image was really uploaded
  // and the config was reconciled. If it returns false (e.g. remap not yet
  // possible) we throw so the UI shows a retry state instead of a false
  // "uploaded" message, and the item stays safely in the queue.
  const done = await _reconcilePendingItem(item)
  if (!done) throw new Error('upload-not-confirmed')
  return true
}

export async function removeSinglePending(id) {
  await removePendingUpload(id)
  await refreshPendingCount()
}

export async function removeAllPending() {
  await clearPendingUploads()
  pendingUploadCount.value = 0
}

export async function uploadAllPending() {
  const pending = await getPendingUploads()
  let uploaded = 0
  for (const item of pending) {
    if (!item.compressedDataUrl || typeof item.compressedDataUrl !== 'string' || item.compressedDataUrl.length < 100) {
      continue
    }
    try {
      const done = await _reconcilePendingItem(item)
      if (done) uploaded++
    } catch {
      // skip failed items — they stay queued for a later retry
    }
  }
  await refreshPendingCount()
  return uploaded
}

// Re-export from cache.service for backward compatibility
export { getPatientPhotoFromStorage, savePatientPhotoToStorage } from './cache.service'
