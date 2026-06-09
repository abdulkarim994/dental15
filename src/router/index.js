import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'app',
    component: () => import('@/pages/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'app-redirect', redirect: '/home' },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/modules/records/AddRecord.vue'),
      },
      {
        path: 'clinics',
        name: 'clinics',
        component: () => import('@/modules/clinics/ClinicsLanding.vue'),
      },
      {
        path: 'clinics/:clinic',
        name: 'clinic-patients',
        component: () => import('@/modules/clinics/ClinicPatients.vue'),
      },
      {
        path: 'clinics/:clinic/:patient',
        name: 'patient-profile',
        component: () => import('@/modules/clinics/PatientProfile.vue'),
      },
      {
        path: 'finance',
        name: 'finance',
        component: () => import('@/modules/finance/FinanceTab.vue'),
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/modules/calendar/CalendarTab.vue'),
      },
      {
        path: 'archive',
        name: 'archive',
        component: () => import('@/modules/archive/ArchiveTab.vue'),
      },
      {
        path: 'queue',
        name: 'queue',
        component: () => import('@/modules/queue/QueueClinicSelect.vue'),
      },
      {
        path: 'queue/:clinic',
        name: 'queue-view',
        component: () => import('@/modules/queue/QueueView.vue'),
      },
      // Legacy redirects — preserve old bookmarks / deep links
      { path: 'add', redirect: '/home' },
      { path: 'records', redirect: '/clinics' },
      { path: 'patients', redirect: '/clinics' },
      { path: 'treasury', redirect: '/finance' },
      { path: 'debts', redirect: { path: '/finance', query: { section: 'debts' } } },
      { path: 'profits', redirect: { path: '/finance', query: { section: 'profits' } } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard: redirect unauthenticated users away from protected routes
let _authGuardReady = false
export function enableAuthGuard() { _authGuardReady = true }

router.beforeEach((to) => {
  if (!_authGuardReady) return true
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
  if (!requiresAuth) return true
  try {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return { name: 'login' }
  } catch {
    // Store not yet initialized
  }
  return true
})

// Prefetch adjacent tab modules after initial navigation settles
let _prefetched = false
router.afterEach(() => {
  if (_prefetched) return
  _prefetched = true
  const ric = globalThis.requestIdleCallback || ((cb) => setTimeout(cb, 100))
  ric(() => {
    import('@/modules/clinics/ClinicsLanding.vue')
    import('@/modules/finance/FinanceTab.vue')
    import('@/modules/calendar/CalendarTab.vue')
  }, { timeout: 5000 })
})

export default router
