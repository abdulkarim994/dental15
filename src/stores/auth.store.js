import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, logout, getSession, restoreSessionFromSecureStorage, onAuthStateChange } from '@/services/auth.service'
import { secureSetSession, secureClearSession } from '@/services/secure-storage.service'
import { setPermissionContext, clearPermissionContext } from '@/services/permissions.service'
import { logError, ErrorCategory } from '@/services/error.service'
import { clearXrayLocalData } from '@/services/image.service'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const uid = ref(null)
  const loading = ref(false)
  const error = ref('')
  const sessionRestored = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email || '')

  const rememberSession = ref(true)

  function _setUser(u) {
    user.value = u
    uid.value = u?.id || null
    if (u?.id) {
      setPermissionContext(u.id, 'owner')
    } else {
      clearPermissionContext()
    }
  }

  async function doLogin(email, password, remember = true) {
    loading.value = true
    error.value = ''
    rememberSession.value = remember
    try {
      const data = await login(email, password)
      _setUser(data.user)
      if (data.session && remember) secureSetSession(data.session)
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function doRegister(email, password) {
    loading.value = true
    error.value = ''
    try {
      const data = await register(email, password)
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function doLogout() {
    try {
      await logout()
    } catch (e) {
      logError(e, { source: 'auth.store.doLogout', category: ErrorCategory.AUTH })
    }
    _setUser(null)
    await secureClearSession()
    sessionRestored.value = false
    // FIX: clear all local image data from IDB on logout (privacy — images must not
    // remain after the user signs out). dental_last_uid is intentionally kept so
    // ensureCleanData can still detect same-user re-login vs account switch.
    try { await clearXrayLocalData() } catch { /* non-critical */ }
  }

  async function checkSession() {
    try {
      const session = await getSession()
      if (session?.user) {
        _setUser(session.user)
        sessionRestored.value = true
        return session
      }
    } catch (e) {
      logError(e, { source: 'auth.store.checkSession', category: ErrorCategory.AUTH })
    }

    // Fallback: try restoring from encrypted storage (works offline)
    if (!sessionRestored.value) {
      try {
        const restored = await restoreSessionFromSecureStorage()
        if (restored?.user) {
          _setUser(restored.user)
          sessionRestored.value = true
          return restored
        }
      } catch (e2) {
        logError(e2, { source: 'auth.store.checkSession.restore', category: ErrorCategory.AUTH })
      }
    }
    return null
  }

  function initAuthListener(onLogin, onLogout) {
    return onAuthStateChange((event, session) => {
      if (session?.user) {
        if (uid.value === session.user.id) return
        _setUser(session.user)
        onLogin?.(session)
      } else {
        _setUser(null)
        onLogout?.()
      }
    })
  }

  return {
    user,
    uid,
    loading,
    error,
    sessionRestored,
    isLoggedIn,
    userEmail,
    rememberSession,
    doLogin,
    doRegister,
    doLogout,
    checkSession,
    initAuthListener,
  }
})
