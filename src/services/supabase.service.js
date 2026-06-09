import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let _sbToken = ''

export function getSbToken() {
  return _sbToken
}

export function setSbToken(token) {
  _sbToken = token
}

const _pendingRequests = new Map()
const _pendingWrites = new Map()
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 10000
const REQUEST_TIMEOUT = 15000

function _retryDelay(attempt) {
  const base = BASE_RETRY_DELAY * Math.pow(2, attempt)
  const jitter = base * 0.3 * Math.random()
  return Math.min(base + jitter, MAX_RETRY_DELAY)
}

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const result = await fn(controller.signal)
      clearTimeout(timer)
      return result
    } catch (e) {
      clearTimeout(timer)
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, _retryDelay(i)))
    }
  }
}

function dedupeKey(type, key) {
  return `${type}:${key}`
}

function isAuthError(error) {
  if (!error) return false
  const msg = error.message || ''
  return msg.includes('JWT') || msg.includes('token') || error.code === '401' || error.code === 'PGRST301'
}

let _onAuthError = null

export function setAuthErrorHandler(handler) {
  _onAuthError = handler
}

let _authErrorDebounce = null

async function handlePossibleAuthError(error) {
  if (!isAuthError(error) || !_onAuthError) return
  // Debounce: avoid multiple redirects from concurrent failing requests
  if (_authErrorDebounce) return
  _authErrorDebounce = setTimeout(() => { _authErrorDebounce = null }, 5000)
  // Try refreshing session before treating as fatal auth error
  try {
    const { data } = await supabase.auth.refreshSession()
    if (data?.session?.access_token) {
      _sbToken = data.session.access_token
      clearTimeout(_authErrorDebounce)
      _authErrorDebounce = null
      return // Refresh succeeded — not a real auth failure
    }
  } catch { /* refresh failed — proceed to auth error handler */ }
  _onAuthError()
}

export async function sbUpsert(uid, dataType, dataKey, data) {
  if (!uid) return

  // Deduplicate writes: wait for previous write to same key before starting
  const wk = dedupeKey(dataType, dataKey || '')
  if (_pendingWrites.has(wk)) {
    try { await _pendingWrites.get(wk) } catch { /* ignore */ }
  }

  const promise = (async () => {
    const { error } = await withRetry((signal) =>
      supabase.from('user_data').upsert(
        { user_id: uid, data_type: dataType, data_key: dataKey || '', data },
        { onConflict: 'user_id,data_type,data_key' },
      ).abortSignal(signal),
    )
    if (error) {
      console.error('[SB] upsert:', error)
      handlePossibleAuthError(error)
    }
  })().finally(() => {
    _pendingWrites.delete(wk)
  })

  _pendingWrites.set(wk, promise)
  return promise
}

export async function sbGet(uid, dataType, dataKey) {
  if (!uid) return null
  const dk = dedupeKey(dataType, dataKey || '')
  if (_pendingRequests.has(dk)) return _pendingRequests.get(dk)

  const promise = withRetry(async (signal) => {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', uid)
      .eq('data_type', dataType)
      .eq('data_key', dataKey || '')
      .maybeSingle()
      .abortSignal(signal)
    if (error) {
      console.error('[SB] get:', error)
      handlePossibleAuthError(error)
      return null
    }
    return data?.data || null
  }).finally(() => {
    _pendingRequests.delete(dk)
  })

  _pendingRequests.set(dk, promise)
  return promise
}

/**
 * Clear all pending request/write tracking.
 * Call on logout or component unmount to prevent stale promises.
 */
export function clearPendingRequests() {
  _pendingRequests.clear()
  _pendingWrites.clear()
}

export async function sbDelete(uid, dataType, dataKey) {
  if (!uid) return
  const { error } = await withRetry((signal) =>
    supabase
      .from('user_data')
      .delete()
      .eq('user_id', uid)
      .eq('data_type', dataType)
      .eq('data_key', dataKey || '')
      .abortSignal(signal),
  )
  if (error) console.error('[SB] delete:', error)
}
