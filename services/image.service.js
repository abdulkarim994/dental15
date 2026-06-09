import { ref } from 'vue'
import { r2Url, fetchImageSecure, uploadImage, deleteImage, compressImage, createThumbnail } from './r2.service'
import { saveThumbnailToIDB, getThumbnailFromIDB, removeThumbnailFromIDB } from './image-pipeline.service'
import { saveXrayFallback, getXrayFallback, removeXrayFallback, clearAllThumbnails, clearAllXrayFallbacks, savePendingUpload, getPendingUploads, removePendingUpload, getPendingUploadCount, clearPendingUploads } from './sqlite.service'
import { isOnline, checkConnectivity } from './offline-queue'

// Reactive version counter — increment to trigger Vue re-renders when thumbnails load
export const xrayVersion = ref(0)

const _imageCache = new Map()
const _thumbPromises = new Map() // Async thumbnail resolution cache
const MAX_CACHE_SIZE = 100

function evictOldest() {
  while (_imageCache.size > MAX_CACHE_SIZE) {
    const oldest = _imageCache.keys().next().value
    if (oldest === undefined) break
    const val = _imageCache.get(oldest)
    if (val && typeof val === 'string' && val.startsWith('blob:')) {
      _revokeTrackedBlob(val)
    }
    _imageCache.delete(oldest)
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
    return fetchImageSecure(key).then(blobUrl => {
      if (blobUrl) {
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
      saveThumbnailData(key, thumbDataUrl)
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
  } catch { /* IndexedDB write failed */ }
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

function saveThumbnailData(key, dataUrl) {
  saveThumbnailToIDB(key, dataUrl).catch(() => {})
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

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _trackedBlobs.size > MAX_CACHE_SIZE) {
      const excess = _trackedBlobs.size - MAX_CACHE_SIZE
      const toRevoke = [..._trackedBlobs].slice(0, excess)
      for (const url of toRevoke) {
        try { URL.revokeObjectURL(url) } catch { /* ignore */ }
        _trackedBlobs.delete(url)
      }
    }
  })
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
        await _tryUploadToR2(item.compressedDataUrl, item.id, item.patientName, item.fileName)
        await removePendingUpload(item.id)
        await refreshPendingCount()
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
    compressed = await compressImage(file, maxWidth, quality)
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
          saveThumbnailData(finalKey, thumbData)
          _imageCache.set(`thumb:${finalKey}`, thumbData)
        }
      }
    } catch (err) {
      console.warn('[Image] R2 upload failed, queuing for later:', err.message)
      // Queue for later upload
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

  return finalKey
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
  try { await clearAllThumbnails() } catch { /* ignore */ }
  try { await clearAllXrayFallbacks() } catch { /* ignore */ }
  try { await clearPendingUploads() } catch { /* ignore */ }
  pendingUploadCount.value = 0
  _imageCache.clear()
  revokeAllImageBlobs()
}

// Track in-flight restore operations to avoid duplicates
const _restoring = new Set()
const _failedKeys = new Map()
const _retryCount = new Map()
const MAX_RETRIES = 3
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
 */
export function restoreThumbnailFromR2(key) {
  if (_imageCache.has(`thumb:${key}`) && _imageCache.has(key)) return
  if (_restoring.has(key)) return
  _restoring.add(key)

  ;(async () => {
    // 1. Check IndexedDB first (fast path)
    const idbThumb = await getThumbnailFromIDB(key).catch(() => null)
    if (idbThumb) {
      _imageCache.set(`thumb:${key}`, idbThumb)
      _failedKeys.delete(key)
    }
    const idbFull = await getLocalXrayDataAsync(key)
    if (idbFull) {
      _imageCache.set(key, idbFull)
    }

    // If we have the thumbnail (with or without full image), render it immediately
    if (idbThumb) {
      xrayVersion.value++
      if (idbFull) {
        _restoring.delete(key)
        return
      }
      // Continue in background to fetch full image from R2, but don't block thumbnail display
    }

    // 1b. If full image exists locally but no thumbnail, generate thumbnail from it
    if (!idbThumb && idbFull) {
      try {
        const localRes = await fetch(idbFull)
        const localBlob = await localRes.blob()
        const thumbBlob = await compressThumbnailToSize(localBlob, 200)
        if (thumbBlob) {
          const thumbDataUrl = await fileToDataUrl(thumbBlob)
          saveThumbnailData(key, thumbDataUrl)
          _imageCache.set(`thumb:${key}`, thumbDataUrl)
          _failedKeys.delete(key)
          xrayVersion.value++
          _restoring.delete(key)
          return
        }
      } catch { /* fall through to R2 */ }
    }

    // 2. Fetch from R2 and regenerate locally
    // Skip R2 fetch if we're offline and already have a thumbnail
    if (idbThumb && !navigator.onLine) {
      _restoring.delete(key)
      return
    }
    try {
      const blobUrl = await fetchImageSecure(key)
      if (!blobUrl) {
        // Don't mark as failed if we already have a thumbnail to show
        if (!idbThumb) _markRetryable(key)
        _restoring.delete(key)
        return
      }
      _trackBlob(blobUrl)
      const res = await fetch(blobUrl)
      const blob = await res.blob()
      _revokeTrackedBlob(blobUrl)

      // Generate and save thumbnail
      if (!idbThumb) {
        const thumbBlob = await compressThumbnailToSize(blob, 200)
        if (thumbBlob) {
          const thumbDataUrl = await fileToDataUrl(thumbBlob)
          saveThumbnailData(key, thumbDataUrl)
          _imageCache.set(`thumb:${key}`, thumbDataUrl)
          _failedKeys.delete(key)
        }
      }

      // Save compressed image locally
      if (!idbFull) {
        const compressedBlob = await compressImage(blob, 1600, 0.7).catch(() => blob)
        const compressedDataUrl = await fileToDataUrl(compressedBlob)
        await saveLocalXrayData(key, compressedDataUrl)
        _imageCache.set(key, compressedDataUrl)
      }

      xrayVersion.value++
    } catch {
      if (!idbThumb) _markRetryable(key)
    }
    _restoring.delete(key)
  })()
}

// ── Public API for pending uploads management ──

export async function getUploadQueue() {
  return getPendingUploads()
}

export async function uploadSinglePending(item) {
  await _tryUploadToR2(item.compressedDataUrl, item.id, item.patientName, item.fileName)
  await removePendingUpload(item.id)
  await refreshPendingCount()
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
    try {
      await _tryUploadToR2(item.compressedDataUrl, item.id, item.patientName, item.fileName)
      await removePendingUpload(item.id)
      uploaded++
      pendingUploadCount.value = Math.max(0, pendingUploadCount.value - 1)
    } catch {
      // skip failed items
    }
  }
  await refreshPendingCount()
  return uploaded
}

// Re-export from cache.service for backward compatibility
export { getPatientPhotoFromStorage, savePatientPhotoToStorage } from './cache.service'
