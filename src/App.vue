<template>
  <router-view />
  <ToastNotification />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import { useQueueStore } from '@/stores/queue.store'
import { useTheme } from '@/composables/useTheme'
import { restoreSessionFromSecureStorage } from '@/services/auth.service'
import { enableAuthGuard } from '@/router'
import { startUploadQueueListener, refreshPendingCount, setXrayKeyRemapHandler } from '@/services/image.service'
import { verifyIDBOwnership } from '@/services/cache.service'
import ToastNotification from '@/components/ToastNotification.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const queueStore = useQueueStore()
const { initTheme } = useTheme()

async function ensureCleanData(uid) {
  const lastUid = localStorage.getItem('dental_last_uid')
  const installId = localStorage.getItem('dental_install_id')

  // Ensure install ID exists (first run after update or fresh install)
  if (!installId) {
    localStorage.setItem('dental_install_id', Date.now() + '_' + Math.random().toString(36).slice(2))
  }

  // Only clear data when switching to a DIFFERENT user
  // Do NOT clear when same user re-logs in (preserves offline data)
  if (lastUid && lastUid !== uid) {
    await appStore.clearLocalData(uid, { isAccountSwitch: true })
  }

  // Verify IndexedDB ownership matches current user
  await verifyIDBOwnership(uid)
  localStorage.setItem('dental_last_uid', uid)
}

function remapXrayKey(oldKey, newKey) {
  if (!oldKey || !newKey || oldKey === newKey) return
  const px = appStore.config.patientXrays
  if (!px) return
  let changed = false
  const next = {}
  for (const [name, keys] of Object.entries(px)) {
    if (Array.isArray(keys) && keys.includes(oldKey)) {
      next[name] = keys.map(k => (k === oldKey ? newKey : k))
      changed = true
    } else {
      next[name] = keys
    }
  }
  if (changed) {
    appStore.updateConfig({ patientXrays: next })
    appStore.saveToCache(authStore.uid)
    appStore.syncSave(authStore.uid, false)
  }
}

onMounted(async () => {
  initTheme()
  setXrayKeyRemapHandler(remapXrayKey)

  authStore.initAuthListener(
    async (session) => {
      // Phase 1 — get the user onto the home screen as fast as possible.
      // Account-switch safety (ensureCleanData) must still run before we read
      // any cached data, but non-critical background work is deferred so the
      // first paint of the home screen is never blocked.
      await ensureCleanData(authStore.uid)
      await appStore.loadFromCacheAsync(authStore.uid)
      queueStore.loadFromCache(authStore.uid)
      router.push({ name: 'home' })
      setTimeout(() => {
        startUploadQueueListener()
        refreshPendingCount()
      }, 0)
      if (navigator.onLine !== false) {
        try {
          await Promise.race([
            appStore.syncLoad(authStore.uid),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
          ])
          appStore.saveToCache(authStore.uid)
        } catch {
          // fallback to cache — already loaded above
        }
      }
    },
    () => {
      router.push({ name: 'login' })
    },
  )

  // Try Supabase session first, then fall back to encrypted secure storage
  let session = await authStore.checkSession()
  if (!session) {
    session = await restoreSessionFromSecureStorage()
    if (session?.user) {
      authStore.user = session.user
      authStore.uid = session.user.id
      await ensureCleanData(session.user.id)
      await appStore.loadFromCacheAsync(session.user.id)
      queueStore.loadFromCache(session.user.id)
      enableAuthGuard()
      router.push({ name: 'home' })
      setTimeout(() => {
        startUploadQueueListener()
        refreshPendingCount()
      }, 0)
      if (navigator.onLine !== false) {
        appStore.syncLoad(session.user.id).then(() => appStore.saveToCache(session.user.id)).catch(() => {})
      }
      return
    }
    enableAuthGuard()
    router.push({ name: 'login' })
  } else {
    enableAuthGuard()
  }
})
</script>
