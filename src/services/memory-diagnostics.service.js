/**
 * Memory Diagnostics Service — Phase 4
 *
 * Non-intrusive memory monitoring for production use:
 * - Image memory usage tracking (blob URLs, cache entries)
 * - WebView / browser memory pressure detection
 * - Cache size tracking (localStorage, IndexedDB estimates)
 * - Periodic sampling with rolling buffer
 *
 * All diagnostics are read-only and never modify state.
 * Designed to be Android-WebView-safe (no performance.measureUserAgentSpecificMemory).
 */

import { getActiveBlobUrlCount } from './image-pipeline.service'
import { getTrackedBlobCount } from './image.service'
import { estimateXrayStorageUsage } from './image-pipeline.service'

const MAX_SNAPSHOTS = 60
const _snapshots = []
let _samplingTimer = null
let _pressureObserver = null

/**
 * Take a single memory snapshot.
 */
export function takeMemorySnapshot() {
  const snapshot = {
    timestamp: Date.now(),
    blobUrls: {
      pipeline: getActiveBlobUrlCount(),
      imageService: getTrackedBlobCount(),
    },
    xrayStorage: _safeCall(estimateXrayStorageUsage),
    localStorage: _estimateLocalStorageUsage(),
    jsHeap: _getJsHeapInfo(),
    cacheEntries: _countCacheEntries(),
  }

  _snapshots.push(snapshot)
  if (_snapshots.length > MAX_SNAPSHOTS) {
    _snapshots.splice(0, _snapshots.length - MAX_SNAPSHOTS)
  }

  return snapshot
}

/**
 * Get the latest snapshot without taking a new one.
 */
export function getLatestSnapshot() {
  return _snapshots.length > 0 ? _snapshots[_snapshots.length - 1] : null
}

/**
 * Get all collected snapshots for trend analysis.
 */
export function getSnapshots() {
  return [..._snapshots]
}

/**
 * Get a summary report of current memory state.
 */
export function getMemoryReport() {
  const current = takeMemorySnapshot()
  const totalBlobs = current.blobUrls.pipeline + current.blobUrls.imageService

  const warnings = []
  if (totalBlobs > 50) warnings.push(`High blob URL count: ${totalBlobs}`)
  if (current.localStorage.usedMB > 4) warnings.push(`localStorage nearing limit: ${current.localStorage.usedMB}MB`)
  if (current.jsHeap && current.jsHeap.usedMB > 100) warnings.push(`High JS heap usage: ${current.jsHeap.usedMB}MB`)

  return {
    ...current,
    totalBlobUrls: totalBlobs,
    warnings,
    snapshotCount: _snapshots.length,
    pressure: _getCurrentPressure(),
  }
}

/**
 * Start periodic memory sampling.
 * @param {number} intervalMs - Sampling interval (default 30s)
 */
export function startMemorySampling(intervalMs = 30000) {
  stopMemorySampling()
  takeMemorySnapshot()
  _samplingTimer = setInterval(() => takeMemorySnapshot(), intervalMs)
  _initPressureObserver()
}

/**
 * Stop periodic memory sampling.
 */
export function stopMemorySampling() {
  if (_samplingTimer) {
    clearInterval(_samplingTimer)
    _samplingTimer = null
  }
  _destroyPressureObserver()
}

/**
 * Check if memory pressure is high (Android WebView concern).
 */
export function isMemoryPressureHigh() {
  const pressure = _getCurrentPressure()
  if (pressure === 'critical' || pressure === 'serious') return true

  const heap = _getJsHeapInfo()
  if (heap && heap.usedRatio > 0.85) return true

  const blobs = getActiveBlobUrlCount() + getTrackedBlobCount()
  if (blobs > 80) return true

  return false
}

// ── Internal helpers ──

let _lastPressureState = 'nominal'

function _getCurrentPressure() {
  return _lastPressureState
}

function _initPressureObserver() {
  if (_pressureObserver) return
  if (typeof PressureObserver === 'undefined') return

  try {
    _pressureObserver = new PressureObserver((records) => {
      for (const record of records) {
        _lastPressureState = record.state || 'nominal'
      }
    }, { sampleInterval: 5000 })
    _pressureObserver.observe('cpu').catch(() => {})
  } catch {
    // PressureObserver not supported
  }
}

function _destroyPressureObserver() {
  if (_pressureObserver) {
    try { _pressureObserver.disconnect() } catch { /* ignore */ }
    _pressureObserver = null
  }
}

function _getJsHeapInfo() {
  if (!performance || !performance.memory) return null
  const mem = performance.memory
  return {
    usedMB: +(mem.usedJSHeapSize / (1024 * 1024)).toFixed(2),
    totalMB: +(mem.totalJSHeapSize / (1024 * 1024)).toFixed(2),
    limitMB: +(mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
    usedRatio: +(mem.usedJSHeapSize / mem.jsHeapSizeLimit).toFixed(4),
  }
}

function _estimateLocalStorageUsage() {
  try {
    let totalChars = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) totalChars += key.length + (localStorage.getItem(key) || '').length
    }
    const bytes = totalChars * 2
    return {
      entries: localStorage.length,
      usedBytes: bytes,
      usedMB: +(bytes / (1024 * 1024)).toFixed(2),
    }
  } catch {
    return { entries: 0, usedBytes: 0, usedMB: 0 }
  }
}

function _countCacheEntries() {
  let dentalEntries = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('dental_')) dentalEntries++
    }
  } catch { /* ignore */ }
  return { dental: dentalEntries, total: localStorage.length }
}

function _safeCall(fn) {
  try { return fn() } catch { return null }
}
