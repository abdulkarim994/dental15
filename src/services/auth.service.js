import { supabase, setSbToken } from './supabase.service'
import { secureSetSession, secureGetSession, secureClearSession } from './secure-storage.service'
import { logError, ErrorCategory } from './error.service'

// ── Refresh token lifecycle ──

const REFRESH_MARGIN_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry
const MAX_REFRESH_RETRIES = 3
const REFRESH_RETRY_DELAY = 2000
let _refreshTimer = null
let _refreshInProgress = null // mutex to prevent concurrent refreshes
let _consecutiveRefreshFailures = 0
let _lastRefreshAttempt = 0
const MIN_REFRESH_INTERVAL = 10000 // minimum 10s between refresh attempts

function scheduleTokenRefresh(session) {
  clearScheduledRefresh()
  _consecutiveRefreshFailures = 0
  if (!session?.expires_at) return
  const expiresMs = session.expires_at * 1000
  const refreshAt = expiresMs - REFRESH_MARGIN_MS - Date.now()
  if (refreshAt <= 0) {
    refreshSession().catch(() => {})
    return
  }
  _refreshTimer = setTimeout(() => refreshSession().catch(() => {}), Math.min(refreshAt, 2147483647))
}

function clearScheduledRefresh() {
  if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null }
}

async function refreshSession() {
  // Prevent concurrent refreshes (race condition guard)
  if (_refreshInProgress) return _refreshInProgress

  // Prevent rapid-fire refresh attempts
  const now = Date.now()
  if (now - _lastRefreshAttempt < MIN_REFRESH_INTERVAL) return null
  _lastRefreshAttempt = now

  // Prevent infinite refresh loops
  if (_consecutiveRefreshFailures >= MAX_REFRESH_RETRIES) {
    logError(new Error('Max refresh retries exceeded — session expired'), {
      source: 'auth.refreshSession', category: ErrorCategory.AUTH,
    })
    _consecutiveRefreshFailures = 0
    return null
  }

  _refreshInProgress = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      if (data?.session) {
        setSbToken(data.session.access_token)
        secureSetSession(data.session)
        scheduleTokenRefresh(data.session)
        _consecutiveRefreshFailures = 0
        return data.session
      }
    } catch (e) {
      _consecutiveRefreshFailures++
      logError(e, { source: 'auth.refreshSession', category: ErrorCategory.AUTH })
      // Retry with backoff if retries remain
      if (_consecutiveRefreshFailures < MAX_REFRESH_RETRIES) {
        await new Promise(r => setTimeout(r, REFRESH_RETRY_DELAY * _consecutiveRefreshFailures))
        _refreshInProgress = null
        return refreshSession()
      }
    } finally {
      _refreshInProgress = null
    }
    return null
  })()

  return _refreshInProgress
}

// ── Error translation ──

export function translateAuthError(msg) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'البريد أو كلمة المرور غير صحيحة'
  if (m.includes('email not confirmed')) return 'البريد لم يتم تأكيده بعد'
  if (m.includes('user not found')) return 'البريد غير مسجّل'
  if (m.includes('invalid email')) return 'صيغة البريد غير صحيحة'
  if (m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة، حاول لاحقاً'
  if (m.includes('already registered') || m.includes('already been registered')) return 'البريد مسجّل مسبقاً'
  if (m.includes('password')) return 'كلمة المرور ضعيفة (6 أحرف+)'
  return msg
}

// ── Auth operations ──

let _authOpLock = false

export async function login(email, password) {
  if (_authOpLock) throw new Error('عملية تسجيل الدخول جارية بالفعل')
  _authOpLock = true
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
    if (data.session) {
      setSbToken(data.session.access_token)
      secureSetSession(data.session)
      scheduleTokenRefresh(data.session)
    }
    return data
  } finally {
    _authOpLock = false
  }
}

export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  return data
}

export async function logout() {
  clearScheduledRefresh()
  _consecutiveRefreshFailures = 0
  _refreshInProgress = null
  _authOpLock = false
  await secureClearSession()
  setSbToken('')
  try {
    await supabase.auth.signOut()
  } catch {
    // Sign-out failure is non-critical — local state already cleared
  }
}

export async function getSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Validate session is not stale
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        // Session expired — try refresh
        const refreshed = await refreshSession()
        return refreshed
      }
      setSbToken(session.access_token)
      secureSetSession(session)
      scheduleTokenRefresh(session)
      return session
    }
  } catch (e) {
    logError(e, { source: 'auth.getSession', category: ErrorCategory.AUTH })
  }
  return null
}

/**
 * Attempt to restore session from encrypted secure storage.
 * Used as crash recovery when Supabase's own session is lost.
 */
export async function restoreSessionFromSecureStorage() {
  let stored
  try {
    stored = await secureGetSession()
  } catch (e) {
    logError(e, { source: 'auth.restoreSession.read', category: ErrorCategory.AUTH })
    return null
  }
  if (!stored?.refresh_token) return null

  // Validate stored session age — reject if data looks corrupted
  if (stored.expires_at && typeof stored.expires_at !== 'number') {
    secureClearSession()
    return null
  }

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    })
    if (error) throw error
    if (data?.session) {
      setSbToken(data.session.access_token)
      secureSetSession(data.session)
      scheduleTokenRefresh(data.session)
      return data.session
    }
  } catch (e) {
    logError(e, { source: 'auth.restoreSession', category: ErrorCategory.AUTH })
    secureClearSession()
  }
  return null
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      setSbToken(session.access_token)
      secureSetSession(session)
      scheduleTokenRefresh(session)
    } else {
      clearScheduledRefresh()
    }
    callback(event, session)
  })
}
