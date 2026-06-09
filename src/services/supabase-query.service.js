/**
 * Supabase Query Service — Phase 2 Scalability Layer
 *
 * Production-grade query layer that wraps the existing supabase.service.js
 * with proper scalability controls:
 *
 * - AbortController per request (cancel in-flight on unmount/re-trigger)
 * - Enhanced request deduplication (reads AND writes)
 * - Configurable timeout with proper cleanup
 * - Retry with exponential backoff + jitter
 * - Typed query builders for the user_data KV pattern
 * - Request lifecycle tracking
 *
 * This does NOT replace supabase.service.js — it provides a higher-level
 * interface that existing code can adopt incrementally.
 */

import { supabase } from './supabase.service'

// ── Configuration ──

const DEFAULT_TIMEOUT = 15000
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 10000
const DEFAULT_CACHE_TTL = 30000 // 30 seconds
const MAX_CACHE_ENTRIES = 100

// ── In-flight request tracking ──

const _inflightReads = new Map()
const _inflightWrites = new Map()
const _activeControllers = new Set()

// ── Query result cache (stale-while-revalidate) ──

const _queryCache = new Map()

/**
 * Create a managed AbortController that is tracked for cleanup.
 */
function createController(timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController()
  _activeControllers.add(controller)

  const timer = setTimeout(() => {
    controller.abort(new Error('Request timeout'))
  }, timeoutMs)

  const cleanup = () => {
    clearTimeout(timer)
    _activeControllers.delete(controller)
  }

  return { controller, signal: controller.signal, cleanup }
}

/**
 * Abort all in-flight requests. Call on component unmount or logout.
 */
export function abortAllRequests() {
  for (const controller of _activeControllers) {
    try { controller.abort() } catch { /* ignore */ }
  }
  _activeControllers.clear()
  _inflightReads.clear()
  _inflightWrites.clear()
}

/**
 * Clear the query result cache. Call on logout or when data is known stale.
 */
export function clearQueryCache() {
  _queryCache.clear()
}

/**
 * Invalidate a specific cache entry by data type (and optionally data key).
 * Use after a write to ensure the next read fetches fresh data.
 */
export function invalidateCache(dataType, dataKey = null) {
  for (const [key] of _queryCache) {
    if (dataKey !== null) {
      if (key.endsWith(`:${dataType}:${dataKey}`)) {
        _queryCache.delete(key)
        return
      }
    } else {
      if (key.includes(`:${dataType}:`)) {
        _queryCache.delete(key)
      }
    }
  }
}

function _getCached(cacheKey, ttl) {
  const entry = _queryCache.get(cacheKey)
  if (!entry) return { hit: false, data: null, stale: false }
  const age = Date.now() - entry.ts
  if (age < ttl) return { hit: true, data: entry.data, stale: false }
  return { hit: true, data: entry.data, stale: true }
}

function _setCache(cacheKey, data) {
  // Evict oldest entries if cache is full
  if (_queryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = _queryCache.keys().next().value
    _queryCache.delete(oldest)
  }
  _queryCache.set(cacheKey, { data, ts: Date.now() })
}

/**
 * Get the count of active in-flight requests.
 */
export function getInflightCount() {
  return _activeControllers.size
}

// ── Retry with jitter ──

function retryDelay(attempt) {
  const base = BASE_RETRY_DELAY * Math.pow(2, attempt)
  const jitter = base * 0.3 * Math.random()
  return Math.min(base + jitter, MAX_RETRY_DELAY)
}

function isRetryable(error) {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('timeout')) return true
  if (msg.includes('network')) return true
  if (msg.includes('fetch')) return true
  if (msg.includes('502') || msg.includes('503') || msg.includes('504')) return true
  if (error.code === 'PGRST503') return true
  return false
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.message === 'Request timeout'
}

// ── Core query functions ──

/**
 * Deduplicated read with AbortController and retry.
 * Multiple callers requesting the same key share one in-flight request.
 */
export async function queryRead(uid, dataType, dataKey = '', options = {}) {
  if (!uid) return null

  const dedupeKey = `${uid}:${dataType}:${dataKey}`
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const retries = options.retries ?? MAX_RETRIES
  const cacheTTL = options.cacheTTL ?? DEFAULT_CACHE_TTL
  const skipCache = options.skipCache === true

  // Check cache first (stale-while-revalidate)
  if (!skipCache && cacheTTL > 0) {
    const cached = _getCached(dedupeKey, cacheTTL)
    if (cached.hit && !cached.stale) {
      return cached.data
    }
    if (cached.hit && cached.stale) {
      // Return stale data immediately, revalidate in background
      _revalidateInBackground(uid, dataType, dataKey, dedupeKey, timeout, retries)
      return cached.data
    }
  }

  // Return existing in-flight request if available
  if (_inflightReads.has(dedupeKey)) {
    return _inflightReads.get(dedupeKey)
  }

  const promise = _executeRead(uid, dataType, dataKey, timeout, retries)
    .then(result => {
      if (cacheTTL > 0) _setCache(dedupeKey, result)
      return result
    })
    .finally(() => {
      _inflightReads.delete(dedupeKey)
    })

  _inflightReads.set(dedupeKey, promise)
  return promise
}

function _revalidateInBackground(uid, dataType, dataKey, cacheKey, timeout, retries) {
  if (_inflightReads.has(cacheKey)) return // Already revalidating
  const promise = _executeRead(uid, dataType, dataKey, timeout, retries)
    .then(result => {
      _setCache(cacheKey, result)
      return result
    })
    .catch(() => {}) // Background revalidation failure is silent
    .finally(() => {
      _inflightReads.delete(cacheKey)
    })
  _inflightReads.set(cacheKey, promise)
}

async function _executeRead(uid, dataType, dataKey, timeout, retries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { controller, signal, cleanup } = createController(timeout)

    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', uid)
        .eq('data_type', dataType)
        .eq('data_key', dataKey)
        .maybeSingle()
        .abortSignal(signal)

      cleanup()

      if (error) {
        if (attempt < retries && isRetryable(error)) {
          await _sleep(retryDelay(attempt))
          continue
        }
        console.error('[SBQuery] read error:', error)
        return null
      }

      return data?.data || null
    } catch (e) {
      cleanup()

      if (isAbortError(e)) {
        if (attempt < retries) {
          await _sleep(retryDelay(attempt))
          continue
        }
        return null
      }

      if (attempt < retries && isRetryable(e)) {
        await _sleep(retryDelay(attempt))
        continue
      }

      throw e
    }
  }

  return null
}

/**
 * Write with deduplication guard — prevents duplicate rapid-fire upserts
 * for the same data_type+data_key within a short window.
 */
export async function queryWrite(uid, dataType, dataKey = '', data, options = {}) {
  if (!uid) return false

  const dedupeKey = `${uid}:${dataType}:${dataKey}`
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const retries = options.retries ?? MAX_RETRIES

  // Invalidate cache for this key on write
  invalidateCache(dataType, dataKey)

  // If a write for the same key is in-flight, wait for it then execute ours
  // (we don't skip — the data may have changed)
  if (_inflightWrites.has(dedupeKey)) {
    try {
      await _inflightWrites.get(dedupeKey)
    } catch { /* ignore previous failure */ }
  }

  const promise = _executeWrite(uid, dataType, dataKey, data, timeout, retries)
    .finally(() => {
      _inflightWrites.delete(dedupeKey)
    })

  _inflightWrites.set(dedupeKey, promise)
  return promise
}

async function _executeWrite(uid, dataType, dataKey, data, timeout, retries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { controller, signal, cleanup } = createController(timeout)

    try {
      const { error } = await supabase
        .from('user_data')
        .upsert(
          { user_id: uid, data_type: dataType, data_key: dataKey, data },
          { onConflict: 'user_id,data_type,data_key' },
        )
        .abortSignal(signal)

      cleanup()

      if (error) {
        if (attempt < retries && isRetryable(error)) {
          await _sleep(retryDelay(attempt))
          continue
        }
        console.error('[SBQuery] write error:', error)
        return false
      }

      return true
    } catch (e) {
      cleanup()

      if (isAbortError(e)) {
        if (attempt < retries) {
          await _sleep(retryDelay(attempt))
          continue
        }
        return false
      }

      if (attempt < retries && isRetryable(e)) {
        await _sleep(retryDelay(attempt))
        continue
      }

      throw e
    }
  }

  return false
}

/**
 * Delete with retry support.
 */
export async function queryDelete(uid, dataType, dataKey = '', options = {}) {
  if (!uid) return false

  const timeout = options.timeout || DEFAULT_TIMEOUT
  const retries = options.retries ?? MAX_RETRIES

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { controller, signal, cleanup } = createController(timeout)

    try {
      const { error } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', uid)
        .eq('data_type', dataType)
        .eq('data_key', dataKey)
        .abortSignal(signal)

      cleanup()

      if (error) {
        if (attempt < retries && isRetryable(error)) {
          await _sleep(retryDelay(attempt))
          continue
        }
        console.error('[SBQuery] delete error:', error)
        return false
      }

      return true
    } catch (e) {
      cleanup()

      if (isAbortError(e) && attempt < retries) {
        await _sleep(retryDelay(attempt))
        continue
      }

      if (attempt < retries && isRetryable(e)) {
        await _sleep(retryDelay(attempt))
        continue
      }

      throw e
    }
  }

  return false
}

// ── Batch operations ──

/**
 * Batch read multiple keys in parallel with concurrency control.
 * Returns results in the same order as the input keys.
 */
export async function batchRead(uid, requests, options = {}) {
  const concurrency = options.concurrency || 5
  const results = new Array(requests.length).fill(null)

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(req =>
        queryRead(uid, req.dataType, req.dataKey || '', {
          timeout: options.timeout,
          retries: options.retries,
        }),
      ),
    )

    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j]
    }
  }

  return results
}

/**
 * Batch write multiple keys with concurrency control.
 * Returns array of success booleans.
 */
export async function batchWrite(uid, entries, options = {}) {
  const concurrency = options.concurrency || 3
  const results = new Array(entries.length).fill(false)

  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(entry =>
        queryWrite(uid, entry.dataType, entry.dataKey || '', entry.data, {
          timeout: options.timeout,
          retries: options.retries,
        }),
      ),
    )

    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j]
    }
  }

  return results
}

// ── Typed Query Builders ──

/**
 * Pre-built typed query functions for the dental clinic data model.
 * These prevent typos and enforce consistency.
 */
export const queries = {
  getIndex: (uid) => queryRead(uid, 'index', ''),
  getDebts: (uid) => queryRead(uid, 'debts', ''),
  getAppointments: (uid) => queryRead(uid, 'appointments', ''),
  getConfig: (uid) => queryRead(uid, 'config', ''),
  getMonth: (uid, month) => queryRead(uid, 'month', month),

  saveIndex: (uid, data) => queryWrite(uid, 'index', '', data),
  saveDebts: (uid, data) => queryWrite(uid, 'debts', '', data),
  saveAppointments: (uid, data) => queryWrite(uid, 'appointments', '', data),
  saveConfig: (uid, data) => queryWrite(uid, 'config', '', data),
  saveMonth: (uid, month, data) => queryWrite(uid, 'month', month, data),
}

// ── Helpers ──

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
