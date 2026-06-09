/**
 * Automatic Cleanup Service — Phase 4
 *
 * Manages lifecycle cleanup to prevent memory leaks and storage bloat:
 * - Stale cache cleanup (expired localStorage entries)
 * - Unused blob URL revocation
 * - Web Worker termination on idle
 * - Periodic maintenance scheduling
 *
 * All cleanup operations are non-destructive to active data.
 * Designed to run in the background without blocking the UI thread.
 */

import { revokeAllBlobUrls, getActiveBlobUrlCount, cleanupOrphanedThumbnails } from './image-pipeline.service'
import { revokeAllImageBlobs, getTrackedBlobCount } from './image.service'
import { terminateWorker } from '@/workers/compress-bridge'
import { isMemoryPressureHigh } from './memory-diagnostics.service'

const STALE_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const IDLE_WORKER_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const PRESSURE_CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute under pressure

let _cleanupTimer = null
let _workerIdleTimer = null
let _lastWorkerUse = 0
let _cleanupLog = []
const MAX_LOG = 50

/**
 * Start the automatic cleanup scheduler.
 * Adjusts frequency based on memory pressure.
 */
export function startAutoCleanup() {
  stopAutoCleanup()
  _scheduleNext()
}

/**
 * Stop the automatic cleanup scheduler.
 */
export function stopAutoCleanup() {
  if (_cleanupTimer) {
    clearTimeout(_cleanupTimer)
    _cleanupTimer = null
  }
  if (_workerIdleTimer) {
    clearTimeout(_workerIdleTimer)
    _workerIdleTimer = null
  }
}

/**
 * Run a full cleanup cycle immediately.
 * Returns a report of what was cleaned.
 */
export function runCleanupCycle(activeXrayKeys = []) {
  const report = {
    timestamp: Date.now(),
    staleCacheRemoved: 0,
    orphanedThumbsRemoved: 0,
    blobsRevoked: 0,
    workerTerminated: false,
  }

  report.staleCacheRemoved = _cleanStaleCacheEntries()
  report.orphanedThumbsRemoved = _cleanOrphanedImages(activeXrayKeys)
  report.blobsRevoked = _cleanUnusedBlobUrls()
  report.workerTerminated = _cleanIdleWorker()

  _logCleanup(report)
  return report
}

/**
 * Run a lightweight cleanup when memory pressure is detected.
 * More aggressive than the regular cycle.
 */
export function runPressureCleanup() {
  const report = {
    timestamp: Date.now(),
    type: 'pressure',
    blobsRevoked: 0,
    workerTerminated: false,
  }

  const pipelineBlobs = getActiveBlobUrlCount()
  const serviceBlobs = getTrackedBlobCount()

  if (pipelineBlobs > 30) {
    revokeAllBlobUrls()
    report.blobsRevoked += pipelineBlobs
  }

  if (serviceBlobs > 30) {
    revokeAllImageBlobs()
    report.blobsRevoked += serviceBlobs
  }

  report.workerTerminated = _cleanIdleWorker()

  _logCleanup(report)
  return report
}

/**
 * Mark that the image compression worker was recently used.
 * Resets the idle timer.
 */
export function markWorkerUsed() {
  _lastWorkerUse = Date.now()
  _resetWorkerIdleTimer()
}

/**
 * Get the cleanup activity log.
 */
export function getCleanupLog() {
  return [..._cleanupLog]
}

// ── Internal cleanup functions ──

function _cleanStaleCacheEntries() {
  let removed = 0
  const now = Date.now()
  const keysToRemove = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('dental_')) continue
      if (!key.endsWith('_ts')) continue

      const ts = Number(localStorage.getItem(key))
      if (ts && (now - ts) > STALE_CACHE_AGE_MS) {
        const dataKey = key.slice(0, -3)
        keysToRemove.push(key, dataKey)
      }
    }

    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key)
        removed++
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  return removed
}

function _cleanOrphanedImages(activeKeys) {
  if (!activeKeys || !activeKeys.length) return 0
  try {
    return cleanupOrphanedThumbnails(activeKeys)
  } catch {
    return 0
  }
}

function _cleanUnusedBlobUrls() {
  let revoked = 0
  const pipelineCount = getActiveBlobUrlCount()
  const serviceCount = getTrackedBlobCount()
  const total = pipelineCount + serviceCount

  if (total > 60) {
    revokeAllBlobUrls()
    revokeAllImageBlobs()
    revoked = total
  }

  return revoked
}

function _cleanIdleWorker() {
  if (_lastWorkerUse === 0) return false
  const idle = Date.now() - _lastWorkerUse
  if (idle > IDLE_WORKER_TIMEOUT_MS) {
    terminateWorker()
    _lastWorkerUse = 0
    return true
  }
  return false
}

function _resetWorkerIdleTimer() {
  if (_workerIdleTimer) clearTimeout(_workerIdleTimer)
  _workerIdleTimer = setTimeout(() => {
    _cleanIdleWorker()
    _workerIdleTimer = null
  }, IDLE_WORKER_TIMEOUT_MS)
}

function _scheduleNext() {
  const interval = isMemoryPressureHigh()
    ? PRESSURE_CLEANUP_INTERVAL_MS
    : CLEANUP_INTERVAL_MS

  _cleanupTimer = setTimeout(() => {
    runCleanupCycle()

    if (isMemoryPressureHigh()) {
      runPressureCleanup()
    }

    _scheduleNext()
  }, interval)
}

function _logCleanup(report) {
  _cleanupLog.push(report)
  if (_cleanupLog.length > MAX_LOG) {
    _cleanupLog.splice(0, _cleanupLog.length - MAX_LOG)
  }
}
