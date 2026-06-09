/**
 * Image Pipeline Service — Phase 3
 *
 * Production-grade image processing pipeline for X-ray images:
 *
 * - Multi-quality image generation (thumbnail 150px, preview 400px, full 1200px)
 * - Smart compression (skips if output is larger than input)
 * - Memory-efficient blob URL management with auto-revocation
 * - Progressive loading support (placeholder → thumbnail → full)
 * - IndexedDB thumbnail storage (replaces localStorage for larger capacity)
 * - Automatic cleanup of old/orphaned thumbnails
 * - Batch processing for multiple images
 *
 * This enhances the existing image.service.js without replacing it.
 */

import { cacheThumbnail, getCachedThumbnail, removeCachedThumbnail } from './sqlite.service'
import { compressInWorker } from '@/workers/compress-bridge'

// ── Configuration ──

const QUALITY = {
  thumbnail: { maxWidth: 150, quality: 0.6 },
  preview: { maxWidth: 400, quality: 0.7 },
  full: { maxWidth: 1200, quality: 0.8 },
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ── Blob URL lifecycle management ──

const _activeBlobUrls = new Set()

/**
 * Create a blob URL and track it for cleanup.
 */
export function createManagedBlobUrl(blob) {
  const url = URL.createObjectURL(blob)
  _activeBlobUrls.add(url)
  return url
}

/**
 * Revoke a specific blob URL.
 */
export function revokeBlobUrl(url) {
  if (url && _activeBlobUrls.has(url)) {
    URL.revokeObjectURL(url)
    _activeBlobUrls.delete(url)
  }
}

/**
 * Revoke all tracked blob URLs (call on component unmount or navigation).
 */
export function revokeAllBlobUrls() {
  for (const url of _activeBlobUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  _activeBlobUrls.clear()
}

/**
 * Get count of active blob URLs (for debugging memory).
 */
export function getActiveBlobUrlCount() {
  return _activeBlobUrls.size
}

// ── Image compression ──

/**
 * Compress an image file to a specific quality level.
 * Returns null if compression increases the file size.
 */
export async function compressToLevel(file, level = 'full') {
  const config = QUALITY[level] || QUALITY.full

  // Try Web Worker with OffscreenCanvas first (non-blocking)
  try {
    const workerResult = await compressInWorker(file, config.maxWidth, config.quality)
    if (workerResult) {
      if (workerResult.size >= file.size && level === 'full') return file
      return workerResult
    }
  } catch { /* fall through to main-thread */ }

  // Fallback: main-thread canvas compression
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > config.maxWidth) {
        height = (height * config.maxWidth) / width
        width = config.maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return }
        if (blob.size >= file.size && level === 'full') {
          resolve(file)
        } else {
          resolve(blob)
        }
      }, 'image/jpeg', config.quality)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

/**
 * Generate all quality levels for an image.
 * Returns { thumbnail: Blob, preview: Blob, full: Blob }
 */
export async function generateAllLevels(file) {
  const [thumbnail, preview, full] = await Promise.all([
    compressToLevel(file, 'thumbnail'),
    compressToLevel(file, 'preview'),
    compressToLevel(file, 'full'),
  ])

  return { thumbnail, preview, full }
}

// ── Thumbnail cache (IndexedDB-based) ──

/**
 * Store a thumbnail in IndexedDB (much larger capacity than localStorage).
 */
export async function saveThumbnailToIDB(key, blob) {
  try {
    let dataUrl
    if (blob instanceof Blob) {
      dataUrl = await blobToDataUrl(blob)
    } else {
      dataUrl = blob // Already a data URL string
    }
    await cacheThumbnail(key, dataUrl)
    return true
  } catch (e) {
    console.warn('[ImagePipeline] Failed to save thumbnail to IDB:', e.message)
    return false
  }
}

/**
 * Get a thumbnail from IndexedDB.
 */
export async function getThumbnailFromIDB(key) {
  try {
    return await getCachedThumbnail(key)
  } catch {
    return null
  }
}

/**
 * Remove a thumbnail from IndexedDB.
 */
export async function removeThumbnailFromIDB(key) {
  try {
    await removeCachedThumbnail(key)
  } catch { /* ignore */ }
}

// ── Progressive loading ──

const _preloadCache = new Map()
const MAX_PRELOAD_CACHE = 10

/**
 * Preload an image URL into the browser cache.
 * Returns a promise that resolves when the image is loaded.
 */
export function preloadImage(url) {
  if (!url) return Promise.resolve(null)

  if (_preloadCache.has(url)) return _preloadCache.get(url)

  const promise = new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })

  _preloadCache.set(url, promise)

  // Evict oldest entries
  if (_preloadCache.size > MAX_PRELOAD_CACHE) {
    const oldest = _preloadCache.keys().next().value
    _preloadCache.delete(oldest)
  }

  return promise
}

/**
 * Preload adjacent images for smooth viewer navigation.
 */
export function preloadAdjacent(images, currentIdx, getUrlFn) {
  const toPreload = []
  if (currentIdx > 0) toPreload.push(images[currentIdx - 1])
  if (currentIdx < images.length - 1) toPreload.push(images[currentIdx + 1])

  for (const img of toPreload) {
    const url = getUrlFn(img)
    if (url) preloadImage(url)
  }
}

// ── Batch thumbnail preload ──

/**
 * Preload thumbnails for a batch of xray keys into the memory cache.
 * Reads from IndexedDB in parallel, avoiding N sequential IDB reads.
 */
export async function batchPreloadThumbnails(keys, getThumbFn) {
  if (!keys || !keys.length) return
  const BATCH = 10
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH)
    await Promise.all(batch.map(key => {
      const k = typeof key === 'string' ? key : key.key || key
      if (!k) return Promise.resolve()
      return getThumbFn(k).catch(() => null)
    }))
  }
}

// ── Cleanup ──

const THUMBNAIL_LS_PREFIX = 'dental_xray_thumb_'
const XRAY_LS_PREFIX = 'dental_xray_'

/**
 * Clean up orphaned localStorage thumbnails that no longer have a matching xray key.
 * @param {string[]} activeKeys - The currently active xray keys
 * @returns {number} Number of entries removed
 */
export function cleanupOrphanedThumbnails(activeKeys) {
  const activeSet = new Set(activeKeys || [])
  let removed = 0

  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    if (key.startsWith(THUMBNAIL_LS_PREFIX)) {
      const xrayKey = key.slice(THUMBNAIL_LS_PREFIX.length)
      if (!activeSet.has(xrayKey)) {
        keysToRemove.push(key)
      }
    } else if (key.startsWith(XRAY_LS_PREFIX) && !key.startsWith(THUMBNAIL_LS_PREFIX)) {
      const xrayKey = key.slice(XRAY_LS_PREFIX.length)
      if (!activeSet.has(xrayKey)) {
        keysToRemove.push(key)
      }
    }
  }

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key)
      removed++
    } catch { /* ignore */ }
  }

  if (removed > 0) {
    if (import.meta.env.DEV) console.log(`[ImagePipeline] Cleaned up ${removed} orphaned image entries`)
  }

  return removed
}

/**
 * Get all active xray keys from the config for cleanup purposes.
 */
export function getAllActiveXrayKeys(patientXrays) {
  if (!patientXrays) return []
  const keys = []
  for (const xrays of Object.values(patientXrays)) {
    if (Array.isArray(xrays)) keys.push(...xrays)
  }
  return keys
}

/**
 * Estimate localStorage usage for xray data.
 */
export function estimateXrayStorageUsage() {
  let totalBytes = 0
  let thumbCount = 0
  let fullCount = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    if (key.startsWith(THUMBNAIL_LS_PREFIX)) {
      const val = localStorage.getItem(key)
      if (val) { totalBytes += val.length * 2; thumbCount++ }
    } else if (key.startsWith(XRAY_LS_PREFIX)) {
      const val = localStorage.getItem(key)
      if (val) { totalBytes += val.length * 2; fullCount++ }
    }
  }

  return {
    totalBytes,
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
    thumbnailCount: thumbCount,
    fullImageCount: fullCount,
  }
}

// ── Helpers ──

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Validate that a file is an acceptable image for upload.
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'لا يوجد ملف' }
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: 'الصورة أكبر من 5MB' }
  if (!file.type.startsWith('image/')) return { valid: false, error: 'الملف ليس صورة' }
  return { valid: true, error: null }
}
