import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { initCache } from './services/cache.service'
import { logError, ErrorCategory, ErrorSeverity } from './services/error.service'

import './assets/styles/tailwind.css'
import './assets/styles/main.css'

// ── Global error handlers — prevent unhandled errors from crashing the app ──
window.addEventListener('error', (event) => {
  logError(event.error || new Error(event.message), {
    source: `global:${event.filename || ''}:${event.lineno || 0}`,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  logError(err, {
    source: 'global:unhandledrejection',
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
  })
})

initCache()

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  logError(err, {
    source: `vue:${info || 'unknown'}`,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
  })
}

app.use(createPinia())
app.use(router)
app.mount('#app')

// Defer database adapter init until after first paint — non-critical for startup
const ric = globalThis.requestIdleCallback || ((cb) => setTimeout(cb, 50))
ric(
  () => import('./services/db-adapter.service').then(m => m.initDatabase()).catch(e => console.warn('[DB] Database init failed, using fallback:', e)),
  { timeout: 2000 },
)
