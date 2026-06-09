/**
 * Offline Queue — Unified Bridge
 *
 * Delegates queue operations to sync-queue.service.js while maintaining
 * the original API surface for backward compatibility.
 * Network status utilities (isOnline, onOnlineStatusChange) remain here
 * as they are independent of the queue implementation.
 */

import { enqueueSyncAction, processQueue as sqProcessQueue } from './sync-queue.service'

const QUEUE_KEY = 'dental_sync_queue'
const QUARANTINE_KEY = 'dental_sync_quarantine'

// Move a permanently-failing legacy item into a quarantine bucket instead of
// silently deleting it, so a failed operation is never lost without a trace.
function quarantineItem(item) {
  try {
    const q = JSON.parse(localStorage.getItem(QUARANTINE_KEY) || '[]')
    q.push({ ...item, quarantinedAt: Date.now() })
    // Keep the quarantine bounded so it can never grow without limit.
    while (q.length > 200) q.shift()
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(q))
  } catch { /* storage unavailable — non-critical */ }
}

export function getQuarantinedLegacyItems() {
  try {
    return JSON.parse(localStorage.getItem(QUARANTINE_KEY) || '[]')
  } catch {
    return []
  }
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToQueue(action) {
  // Delegate to the enhanced sync queue service with dedup + backoff
  enqueueSyncAction({
    type: action.type || 'sync',
    table: action.table || '',
    recordId: action.recordId || '',
    data: action,
  }).catch(() => {
    // Fallback: save to localStorage if enhanced queue fails
    const queue = getQueue()
    queue.push({ ...action, ts: Date.now(), retries: 0 })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  })
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

export function removeFromQueue(ts) {
  const queue = getQueue().filter(q => q.ts !== ts)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

let _realOnline = navigator.onLine !== false
let _pingTimer = null
const PING_INTERVAL = 10000

export function isOnline() {
  return _realOnline
}

export { checkConnectivity }

async function checkConnectivity() {
  if (!navigator.onLine) { _realOnline = false; return false }
  try {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
    const key = import.meta.env.VITE_SUPABASE_KEY || ''
    if (!url) { _realOnline = navigator.onLine !== false; return _realOnline }
    // Real reachability check: a CORS-enabled request whose response we can
    // actually read. The previous `mode:'no-cors'` returned an opaque response
    // that always "succeeded" — even behind a captive portal or on a 5xx —
    // which made the app believe it was online and attempt failing syncs.
    const r = await fetch(url + '/rest/v1/', {
      method: 'HEAD',
      cache: 'no-store',
      headers: key ? { apikey: key } : undefined,
      signal: AbortSignal.timeout(5000),
    })
    // Any readable HTTP response (even 4xx auth errors) proves the server is
    // reachable; only network failures/timeouts mean we are truly offline.
    _realOnline = true
    return true
  } catch {
    _realOnline = false
    return false
  }
}

let _listeners = []
export function onOnlineStatusChange(cb) {
  const notify = (v) => { if (_realOnline !== v) { _realOnline = v; cb(v) } }
  const onOnline = () => { checkConnectivity().then(ok => { if (ok) notify(true) }) }
  const onOffline = () => notify(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  _listeners.push({ onOnline, onOffline })
  if (!_pingTimer) {
    _pingTimer = setInterval(() => {
      const wasBefore = _realOnline
      checkConnectivity().then(ok => {
        if (ok !== wasBefore) cb(ok)
      })
    }, PING_INTERVAL)
  }
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null }
  }
}

export async function processQueue(syncFn) {
  if (!isOnline()) return false

  // Process the enhanced sync queue first
  try {
    await sqProcessQueue(syncFn)
  } catch { /* non-critical */ }

  // Also drain any legacy localStorage items
  const queue = getQueue()
  if (!queue.length) return true
  let allOk = true
  for (const item of queue) {
    try {
      await syncFn(item)
      removeFromQueue(item.ts)
    } catch {
      item.retries = (item.retries || 0) + 1
      if (item.retries > 5) {
        // Do not silently drop a failing operation — quarantine it first so it
        // can be inspected/retried, then remove it from the active queue.
        quarantineItem(item)
        removeFromQueue(item.ts)
      } else {
        // Persist the incremented retry count so backoff state survives restarts.
        const queueNow = getQueue().map(q => (q.ts === item.ts ? { ...q, retries: item.retries } : q))
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queueNow)) } catch { /* non-critical */ }
      }
      allOk = false
    }
  }
  return allOk
}
