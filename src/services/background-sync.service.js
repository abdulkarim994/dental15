/**
 * Background Sync Service
 *
 * Orchestrates offline-first data flow:
 * 1. Local writes go to repositories + sync queue immediately (optimistic)
 * 2. Background process picks up queue items and syncs to Supabase
 * 3. Conflict resolution ensures data integrity
 * 4. Online/offline transitions trigger appropriate sync actions
 *
 * This service coordinates between:
 * - Local repositories (patients, appointments, xrays)
 * - Sync queue (pending changes)
 * - Supabase (source of truth)
 * - Existing sync.service.js (preserved for compatibility)
 *
 * It does NOT replace the existing sync — it enhances it with a proper
 * offline queue processing layer.
 */

import { processQueue, enqueueSyncAction, getPendingCount } from './sync-queue.service'
import { patientsRepo } from '@/repositories/patients.repository'
import { appointmentsRepo } from '@/repositories/appointments.repository'
import { xraysRepo } from '@/repositories/xrays.repository'
import { isDatabaseReady, isUsingSQLite } from './db-adapter.service'
import { setSyncMeta, getSyncMeta } from './sqlite-native.service'

let _syncInterval = null
let _isProcessing = false
let _onlineListener = null
let _offlineListener = null
let _syncCallbacks = []
let _pendingTimeouts = []

const SYNC_INTERVAL_MS = 30000 // 30 seconds
const SYNC_ON_RECONNECT_DELAY = 2000 // 2 seconds after coming back online

/**
 * Initialize background sync.
 * Sets up periodic queue processing and online/offline listeners.
 */
export function startBackgroundSync(syncHandler) {
  if (_syncInterval) return // Already running

  // Process queue on an interval
  _syncInterval = setInterval(async () => {
    await _processSyncQueue(syncHandler)
  }, SYNC_INTERVAL_MS)

  // Process immediately when coming back online (cancel previous pending to avoid races)
  let _reconnectTimeout = null
  _onlineListener = () => {
    if (_reconnectTimeout) {
      clearTimeout(_reconnectTimeout)
      _pendingTimeouts = _pendingTimeouts.filter(t => t !== _reconnectTimeout)
    }
    _reconnectTimeout = setTimeout(() => {
      _pendingTimeouts = _pendingTimeouts.filter(t => t !== _reconnectTimeout)
      _reconnectTimeout = null
      _processSyncQueue(syncHandler)
    }, SYNC_ON_RECONNECT_DELAY)
    _pendingTimeouts.push(_reconnectTimeout)
    _notifyCallbacks('online')
  }

  _offlineListener = () => {
    _notifyCallbacks('offline')
  }

  window.addEventListener('online', _onlineListener)
  window.addEventListener('offline', _offlineListener)

  // Initial sync if online
  if (navigator.onLine !== false) {
    const tid = setTimeout(() => {
      _pendingTimeouts = _pendingTimeouts.filter(t => t !== tid)
      _processSyncQueue(syncHandler)
    }, 1000)
    _pendingTimeouts.push(tid)
  }

  if (import.meta.env.DEV) console.log('[BackgroundSync] Started')
}

/**
 * Stop background sync processing
 */
export function stopBackgroundSync() {
  if (_syncInterval) {
    clearInterval(_syncInterval)
    _syncInterval = null
  }

  // Clear all pending timeouts to prevent stale execution after stop
  for (const tid of _pendingTimeouts) {
    clearTimeout(tid)
  }
  _pendingTimeouts = []

  if (_onlineListener) {
    window.removeEventListener('online', _onlineListener)
    _onlineListener = null
  }

  if (_offlineListener) {
    window.removeEventListener('offline', _offlineListener)
    _offlineListener = null
  }

  _syncCallbacks = []
  if (import.meta.env.DEV) console.log('[BackgroundSync] Stopped')
}

/**
 * Register a callback for sync events
 * Events: 'sync_start', 'sync_complete', 'sync_error', 'online', 'offline'
 */
export function onSyncEvent(callback) {
  _syncCallbacks.push(callback)
  return () => {
    _syncCallbacks = _syncCallbacks.filter(cb => cb !== callback)
  }
}

/**
 * Get the current sync status
 */
export async function getSyncStatus() {
  const pendingCount = await getPendingCount()
  const lastSync = isUsingSQLite() ? await getSyncMeta('last_sync_ts').catch(() => null) : null
  return {
    isProcessing: _isProcessing,
    isOnline: navigator.onLine !== false,
    pendingCount,
    isRunning: !!_syncInterval,
    lastSyncTimestamp: lastSync ? Number(lastSync) : null,
  }
}

/**
 * Trigger an immediate sync (useful after a batch of local changes)
 */
export async function triggerImmediateSync(syncHandler) {
  if (!navigator.onLine) return { success: false, reason: 'offline' }
  return _processSyncQueue(syncHandler)
}

/**
 * Cache data from Supabase into local repositories.
 * Called after a successful Supabase load to populate the offline cache.
 */
export async function cacheSupabaseData({ records, prosthetics, appointments }) {
  if (!isDatabaseReady()) return

  const tasks = []

  if (records || prosthetics) {
    tasks.push(
      patientsRepo.cacheFromRecords(records || [], prosthetics || []).catch(e => {
        console.warn('[BackgroundSync] Failed to cache patients:', e.message)
      }),
    )
  }

  if (appointments) {
    tasks.push(
      appointmentsRepo.cacheFromSupabase(appointments).catch(e => {
        console.warn('[BackgroundSync] Failed to cache appointments:', e.message)
      }),
    )
  }

  await Promise.all(tasks)
}

/**
 * Optimistic local write + enqueue for sync.
 * The write happens immediately in the local repository.
 * The sync to Supabase happens in the background.
 */
export async function optimisticWrite(table, action, record) {
  if (!isDatabaseReady()) return

  const repo = _getRepo(table)
  if (!repo) return

  // Apply locally first (optimistic)
  try {
    if (action === 'delete') {
      await repo.delete(record.id)
    } else {
      await repo.upsert(record)
    }
  } catch (e) {
    console.warn(`[BackgroundSync] Local write failed for ${table}:${action}:`, e.message)
  }

  // Enqueue for Supabase sync
  await enqueueSyncAction({
    type: `${table}_${action}`,
    table,
    recordId: record.id,
    data: record,
  })
}

// ── Internal ──

async function _processSyncQueue(syncHandler) {
  if (_isProcessing) return { success: false, reason: 'already_processing' }
  if (navigator.onLine === false) return { success: false, reason: 'offline' }

  _isProcessing = true
  _notifyCallbacks('sync_start')

  try {
    const result = await processQueue(syncHandler)

    // Record last successful sync timestamp
    if (result.success && isUsingSQLite()) {
      setSyncMeta('last_sync_ts', Date.now()).catch(() => {})
    }

    _notifyCallbacks('sync_complete', result)
    return result
  } catch (e) {
    console.error('[BackgroundSync] Queue processing error:', e)
    _notifyCallbacks('sync_error', { error: e.message })
    return { success: false, reason: e.message }
  } finally {
    _isProcessing = false
  }
}

function _getRepo(table) {
  switch (table) {
    case 'patients': return patientsRepo
    case 'appointments': return appointmentsRepo
    case 'xrays': return xraysRepo
    default: return null
  }
}

function _notifyCallbacks(event, data = null) {
  for (const cb of _syncCallbacks) {
    try {
      cb(event, data)
    } catch { /* ignore callback errors */ }
  }
}
