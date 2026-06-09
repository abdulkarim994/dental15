/**
 * Diagnostics Service — Phase 6
 *
 * Centralized diagnostic hub that aggregates metrics from all subsystems.
 * Provides a single entry point for health checks, performance snapshots,
 * and runtime diagnostics without coupling subsystems to each other.
 *
 * Usage:
 *   import { getDiagnosticReport } from '@/services/diagnostics.service'
 *   const report = getDiagnosticReport()
 */

import { getMemoryReport, getSnapshots } from './memory-diagnostics.service'
import { getCleanupLog } from './auto-cleanup.service'
import { getErrorLog, getErrorStats } from './error.service'
import { getSyncStatus } from './background-sync.service'
import { getQueueStats } from './sync-queue.service'
import { getInflightCount } from './supabase-query.service'

/**
 * Generate a comprehensive diagnostic report.
 */
export function getDiagnosticReport() {
  return {
    timestamp: Date.now(),
    memory: _safeCall(getMemoryReport),
    memoryTrend: _safeCall(() => {
      const snaps = getSnapshots()
      if (snaps.length < 2) return null
      const first = snaps[0]
      const last = snaps[snaps.length - 1]
      return {
        samples: snaps.length,
        durationMs: last.timestamp - first.timestamp,
        blobUrlDelta: (last.blobUrls?.pipeline || 0) - (first.blobUrls?.pipeline || 0),
      }
    }),
    sync: _safeCall(getSyncStatus),
    queue: _safeCall(getQueueStats),
    errors: _safeCall(getErrorStats),
    cleanup: _safeCall(() => {
      const log = getCleanupLog()
      return {
        totalCycles: log.length,
        lastCycle: log.length > 0 ? log[log.length - 1] : null,
      }
    }),
    network: {
      inflightRequests: _safeCall(getInflightCount) || 0,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
  }
}

/**
 * Get a minimal health check (fast, suitable for periodic polling).
 */
export function getHealthCheck() {
  return {
    timestamp: Date.now(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    sync: _safeCall(getSyncStatus),
    errorCount: _safeCall(() => getErrorLog().length) || 0,
    inflightRequests: _safeCall(getInflightCount) || 0,
  }
}

/**
 * Export diagnostic report as a downloadable JSON string.
 */
export function exportDiagnostics() {
  const report = getDiagnosticReport()
  report.errorLog = _safeCall(getErrorLog)
  report.cleanupLog = _safeCall(getCleanupLog)
  report.memorySnapshots = _safeCall(getSnapshots)
  return JSON.stringify(report, null, 2)
}

function _safeCall(fn) {
  try { return fn() } catch { return null }
}
