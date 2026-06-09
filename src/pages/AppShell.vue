<template>
  <div class="pb-28">
    <!-- HEADER -->
    <header class="nav-wrap sticky top-0 z-50 px-4 py-3">
      <div class="max-w-lg mx-auto flex justify-between items-center gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <button class="glass-sm w-12 h-12 flex items-center justify-center flex-shrink-0" title="الإعدادات" @click="openSettings">
            <IconSettings />
          </button>
          <div class="min-w-0">
            <h1 class="text-base font-black truncate leading-none" style="color:var(--gold)">{{ centerName }}</h1>
            <p class="text-[9px] opacity-35 mt-0.5 truncate flex items-center gap-1">
              <span>{{ userEmail }}</span>
              <span style="width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0" :style="{ backgroundColor: online ? '#4ade80' : '#f87171', boxShadow: online ? '0 0 4px #4ade80' : 'none' }"></span>
              <span :style="{ color: online ? '#4ade80' : '#f87171', fontSize: '8px', opacity: 1 }">{{ online ? 'متصل' : 'غير متصل' }}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button v-if="pendingUploads > 0" class="pending-badge" :title="pendingUploads + ' صور بانتظار الرفع'" @click="showPendingUploads = true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>{{ pendingUploads }}</span>
          </button>
          <button class="glass-sm w-12 h-12 flex items-center justify-center" title="مزامنة" @click="manualSync">
            <IconSync :spinning="isSyncing" />
          </button>
          <input
            type="month"
            :value="selectedMonth"
            class="inp"
            style="width:auto;padding:8px 12px;font-size:12px;border-radius:12px"
            @change="onMonthChange"
          >
        </div>
      </div>
    </header>

    <!-- NAV TABS -->
    <nav class="nav-wrap sticky top-[57px] z-40">
      <div class="max-w-lg mx-auto flex">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-b"
          :class="{ on: isTabActive(tab.id) }"
          @click="goTab(tab.id)"
        >
          <span class="relative" style="display:block;margin:0 auto 3px">
            <component :is="tab.icon" />
            <span
              v-if="tab.id === 'finance' && debtBadge > 0"
              class="d-pulse absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white font-black flex items-center justify-center"
              style="font-size:8px;padding:0 3px;line-height:16px"
            >{{ debtBadge }}</span>
          </span>
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <!-- FAB — Quick Add -->
    <button
      v-if="activeTab !== 'home' && fabVisible"
      class="fab-add btn-g"
      :class="'fab-' + fabPosition"
      @click="goTab('home')"
      title="إضافة سجل جديد"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- TAB CONTENT -->
    <div class="max-w-lg mx-auto px-4 mt-4" @touchstart.passive="onSwipeStart" @touchmove.passive="onSwipeMove" @touchend.passive="onSwipeEnd">
      <router-view v-slot="{ Component }">
        <keep-alive :max="5">
          <component :is="Component" class="tab-in" />
        </keep-alive>
      </router-view>
    </div>
  </div>

  <SyncOverlay />
  <SettingsModal :visible="showSettings" @close="showSettings = false" />
  <PendingUploadsPopup :visible="showPendingUploads" @close="showPendingUploads = false" />

  <!-- Back-to-exit toast -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="backToast" class="back-toast">{{ backToast }}</div>
    </Transition>
  </Teleport>

  <!-- Appointment Notification Overlay -->
  <Teleport to="body">
    <div v-if="apptNotifVisible" class="appt-notif-ol" @click.self="apptNotifVisible = false">
      <div class="appt-notif-box">
        <div class="an-header">
          <div class="an-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            المواعيد القادمة
          </div>
          <button class="an-close" @click="apptNotifVisible = false">✕</button>
        </div>
        <div v-if="todayAppts.length" class="an-section">
          <div class="an-section-title">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            مواعيد اليوم ({{ todayAppts.length }})
          </div>
          <div v-for="a in todayAppts" :key="a.id" class="an-card">
            <div><div class="an-name">{{ a.name || '—' }}</div><div class="an-svc">{{ a.service || '' }}</div></div>
            <div class="an-time">{{ a.time ? formatTime12h(a.time) : '—' }}</div>
          </div>
        </div>
        <div v-if="tmrwAppts.length" class="an-section">
          <div class="an-section-title">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            مواعيد الغد ({{ tmrwAppts.length }})
          </div>
          <div v-for="a in tmrwAppts" :key="a.id" class="an-card">
            <div><div class="an-name">{{ a.name || '—' }}</div><div class="an-svc">{{ a.service || '' }}</div></div>
            <div class="an-time">{{ a.time ? formatTime12h(a.time) : '—' }}</div>
          </div>
        </div>
        <div class="an-footer"><button @click="apptNotifVisible = false">حسناً</button></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isOnline, onOnlineStatusChange, processQueue } from '@/services/offline-queue'
import { refreshPendingCount as refreshImgPending, startUploadQueueListener, stopUploadQueueListener, getUploadQueue } from '@/services/image.service'
import { ensureMonthLoaded, loadAllMonths, mergeMonthData, setupRealtimeSubscriptions, clearRealtimeSubscriptions } from '@/services/sync.service'
import { setAuthErrorHandler, clearPendingRequests } from '@/services/supabase.service'
import { abortAllRequests as abortSBQueries, clearQueryCache } from '@/services/supabase-query.service'
import { logError, ErrorCategory } from '@/services/error.service'
import { startMemorySampling, stopMemorySampling } from '@/services/memory-diagnostics.service'
import { startAutoCleanup, stopAutoCleanup, runCleanupCycle } from '@/services/auto-cleanup.service'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import IconSettings from '@/components/icons/IconSettings.vue'
import IconSync from '@/components/icons/IconSync.vue'
import IconHome from '@/components/icons/IconHome.vue'
import IconClinics from '@/components/icons/IconClinics.vue'
import IconFinance from '@/components/icons/IconFinance.vue'
import IconCalendar from '@/components/icons/IconCalendar.vue'
import IconQueue from '@/components/icons/IconQueue.vue'
import { useQueueStore } from '@/stores/queue.store'
import { defineAsyncComponent } from 'vue'
import SyncOverlay from '@/components/SyncOverlay.vue'
import { pendingUploadCount } from '@/services/image.service'

const SettingsModal = defineAsyncComponent(() => import('@/components/SettingsModal.vue'))
const PendingUploadsPopup = defineAsyncComponent(() => import('@/components/PendingUploadsPopup.vue'))

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const syncSt = useSyncStore()
const { toast } = useToast()
const { initTheme } = useTheme()

const queueSt = useQueueStore()

const bookingType = computed(() => appStore.config?.bookingType || 'traditional')

const tabs = computed(() => {
  const base = [
    { id: 'home', label: 'الرئيسية', icon: IconHome },
    { id: 'clinics', label: 'السجلات', icon: IconClinics },
    { id: 'finance', label: 'المالية', icon: IconFinance },
  ]
  if (bookingType.value === 'queue') {
    base.push({ id: 'queue', label: 'الحجوزات', icon: IconQueue })
  } else {
    base.push({ id: 'calendar', label: 'الجدول', icon: IconCalendar })
  }
  return base
})

const activeTab = computed(() => route.name || 'home')
function isTabActive(tabId) {
  const name = route.name || 'home'
  if (tabId === 'clinics') return ['clinics', 'clinic-patients', 'patient-profile', 'archive'].includes(name)
  if (tabId === 'finance') return ['finance'].includes(name)
  if (tabId === 'queue') return ['queue', 'queue-view'].includes(name)
  return name === tabId
}
const selectedMonth = computed(() => appStore.selectedMonth)
const centerName = computed(() => appStore.centerName)
const userEmail = computed(() => authStore.userEmail)
const fabPosition = computed(() => appStore.config?.fabPosition || 'center')
const fabVisible = computed(() => appStore.config?.fabVisible !== false)
const isSyncing = computed(() => appStore.syncing)

const debtBadge = computed(() => {
  return appStore.debts.filter(d => d.status !== 'paid').length
})

const pendingUploads = computed(() => pendingUploadCount.value)
const showPendingUploads = ref(false)

function goTab(id) {
  appStore.activeTab = id
  router.push({ name: id })
}

async function onMonthChange(e) {
  const month = e.target.value
  appStore.selectedMonth = month
  const data = await ensureMonthLoaded(authStore.uid, month)
  if (data) {
    const merged = mergeMonthData(month, data, appStore.records, appStore.prosthetics)
    appStore.records = merged.records
    appStore.prosthetics = merged.prosthetics
    appStore.saveToCache(authStore.uid)
  }
}

async function manualSync() {
  try {
    syncSt.syncing = true
    syncSt.syncMessage = 'جار حفظ البيانات...'
    syncSt.syncProgress = 0

    // 1. Force save all data to Supabase (bypass dirty flags)
    syncSt.syncProgress = 5
    const ok = await appStore.syncSave(authStore.uid, false, true)

    // 2. Load all data from Supabase (all months, not just current+previous)
    syncSt.syncMessage = 'جار تحميل البيانات...'
    syncSt.syncProgress = 40
    await appStore.syncLoad(authStore.uid, false, { loadAllMonthsFlag: true })

    // 3. Save merged result to local cache
    syncSt.syncMessage = 'جار حفظ البيانات محلياً...'
    syncSt.syncProgress = 90
    appStore.saveToCache(authStore.uid)

    syncSt.syncProgress = 100
    if (!ok) toast('⚠ تحقق من الاتصال')
    else toast('تمت المزامنة بنجاح')
  } catch {
    toast('فشلت المزامنة')
  } finally {
    syncSt.syncing = false
  }
}

const showSettings = ref(false)
function openSettings() {
  showSettings.value = true
}

let syncTimer = null
const online = ref(isOnline())
let unsubOnline = null
let realtimeUnsubs = []

/* ── Appointment Notification ── */
const apptNotifVisible = ref(false)
const todayAppts = ref([])
const tmrwAppts = ref([])

function formatTime12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function showApptNotification() {
  if (appStore.config.apptNotif === false) return
  const today = new Date().toISOString().substring(0, 10)
  const tmrw = new Date(Date.now() + 86400000).toISOString().substring(0, 10)
  const tAppts = (appStore.appointments || []).filter(a => a.date === today && a.status !== 'cancelled').sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const mAppts = (appStore.appointments || []).filter(a => a.date === tmrw && a.status !== 'cancelled').sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  if (!tAppts.length && !mAppts.length) return
  todayAppts.value = tAppts
  tmrwAppts.value = mAppts
  apptNotifVisible.value = true
}

/* ── Android Back Button Handler (double-tap to exit) ── */
let _lastBackPress = 0
const _backExitTimeout = 2000
const backToast = ref('')
let _backToastTimer = null

function handlePopState() {
  if (showSettings.value) { showSettings.value = false; history.pushState({ tab: 'shell' }, ''); return }
  if (apptNotifVisible.value) { apptNotifVisible.value = false; history.pushState({ tab: 'shell' }, ''); return }
  const currentTab = route.name || 'home'
  if (currentTab !== 'home') {
    appStore.activeTab = 'home'
    router.push({ name: 'home' })
    history.pushState({ tab: 'home' }, '')
    return
  }
  const now = Date.now()
  if (now - _lastBackPress < _backExitTimeout) {
    // Double press — exit app
    _exitApp()
    return
  }
  _lastBackPress = now
  backToast.value = 'اضغط مرة أخرى للخروج'
  clearTimeout(_backToastTimer)
  _backToastTimer = setTimeout(() => { backToast.value = '' }, _backExitTimeout)
  history.pushState({ tab: 'home' }, '')
}

async function _exitApp() {
  try {
    const { App } = await import('@capacitor/app')
    App.exitApp()
  } catch {
    window.close()
  }
}

/* ── Swipe between tabs ── */
const tabIds = computed(() => tabs.value.map(t => t.id))
let _swipeStartX = 0
let _swipeStartY = 0
let _swiping = false

function onSwipeStart(e) {
  if (e.touches.length !== 1) return
  _swipeStartX = e.touches[0].clientX
  _swipeStartY = e.touches[0].clientY
  _swiping = true
}

function onSwipeMove(e) {
  if (!_swiping || e.touches.length !== 1) return
  const dx = e.touches[0].clientX - _swipeStartX
  const dy = e.touches[0].clientY - _swipeStartY
  if (Math.abs(dy) > Math.abs(dx)) { _swiping = false }
}

function onSwipeEnd(e) {
  if (!_swiping) return
  _swiping = false
  const endX = e.changedTouches[0].clientX
  const dx = endX - _swipeStartX
  if (Math.abs(dx) < 60) return
  const currentIdx = tabIds.value.indexOf(route.name || 'home')
  if (currentIdx < 0) return
  // RTL: swipe left (dx < 0) = next tab, swipe right (dx > 0) = prev tab
  const nextIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1
  if (nextIdx < 0 || nextIdx >= tabIds.value.length) return
  goTab(tabIds.value[nextIdx])
}

onMounted(() => {
  initTheme()
  if (appStore.config.autoSync) {
    syncTimer = setInterval(
      () => appStore.syncSave(authStore.uid, false),
      (appStore.config.syncMin || 30) * 60 * 1000,
    )
  }
  unsubOnline = onOnlineStatusChange((status) => {
    online.value = status
    if (status) {
      toast('عاد الاتصال — جاري المزامنة...')
      processQueue(async () => {
        await appStore.syncSave(authStore.uid, false)
      })
      refreshImgPending()
    } else {
      toast('الوضع غير متصل — العمل محلياً')
    }
  })
  setTimeout(() => showApptNotification(), 800)
  window.addEventListener('popstate', handlePopState)
  history.pushState({ tab: 'home' }, '')
  // Capacitor native back button (Android hardware back)
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', () => { handlePopState() })
  }).catch(() => {})
  realtimeUnsubs = setupRealtimeSubscriptions(authStore.uid, () => {
    appStore.syncLoad(authStore.uid, false)
  })
  // Token refresh is now managed centrally by auth.service.js (scheduleTokenRefresh)
  // — no manual setInterval needed here

  // Activate background sync queue processing (Phase 6 activation)
  appStore.initBackgroundSync(async (item) => {
    try {
      await appStore.syncSave(authStore.uid, false)
    } catch (e) {
      logError(e, { source: 'BackgroundSync.handler', category: ErrorCategory.SYNC })
    }
  })

  // Process any pending image uploads from previous sessions
  refreshImgPending()
  startUploadQueueListener()

  // Ensure pending upload keys are in config (recovery after logout)
  getUploadQueue().then(pendingItems => {
    if (!pendingItems.length) return
    const xrays = { ...(appStore.config.patientXrays || {}) }
    let changed = false
    for (const item of pendingItems) {
      if (item.patientName && item.id) {
        const existing = xrays[item.patientName] || []
        if (!existing.includes(item.id)) {
          xrays[item.patientName] = [...existing, item.id]
          changed = true
        }
      }
    }
    if (changed) {
      appStore.updateConfig({ patientXrays: xrays })
      appStore.saveToCache(authStore.uid)
    }
  }).catch(() => {})

  // Start memory diagnostics and auto-cleanup (Phase 4)
  startMemorySampling(30000)
  startAutoCleanup()

  // Defer image cleanup + thumbnail preload to idle time
  const ric = globalThis.requestIdleCallback || ((cb) => setTimeout(cb, 2000))
  ric(async () => {
    try {
      const { getAllActiveXrayKeys } = await import('@/services/image-pipeline.service')
      const activeKeys = getAllActiveXrayKeys(appStore.config.patientXrays)
      runCleanupCycle(activeKeys)

      // Pre-load thumbnails for the first batch of xrays so they appear instantly
      if (activeKeys.length > 0) {
        const { restoreThumbnailFromR2 } = await import('@/services/image.service')
        const preloadBatch = activeKeys.slice(0, 30)
        for (const key of preloadBatch) {
          restoreThumbnailFromR2(key)
        }
      }
    } catch { /* non-critical */ }
  }, { timeout: 10000 })
  setAuthErrorHandler(() => {
    toast('انتهت الجلسة — يرجى تسجيل الدخول مجدداً')
    clearRealtimeSubscriptions(realtimeUnsubs)
    realtimeUnsubs = []
    router.push({ name: 'login' })
  })

  document.addEventListener('visibilitychange', _onVisChange)
})

function _onVisChange() {
  if (document.visibilityState === 'hidden' && authStore.uid) {
    appStore.saveToCache(authStore.uid)
  }
}

onUnmounted(() => {
  clearInterval(syncTimer)
  syncTimer = null
  appStore.destroyBackgroundSync()
  stopUploadQueueListener()
  stopMemorySampling()
  stopAutoCleanup()
  unsubOnline?.()
  unsubOnline = null
  window.removeEventListener('popstate', handlePopState)
  document.removeEventListener('visibilitychange', _onVisChange)
  clearRealtimeSubscriptions(realtimeUnsubs)
  realtimeUnsubs = []
  setAuthErrorHandler(null)
  clearPendingRequests()
  abortSBQueries()
  clearQueryCache()
})
</script>
