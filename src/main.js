import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { initCache } from './services/cache.service'

import './assets/styles/tailwind.css'
import './assets/styles/main.css'

initCache()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Defer database adapter init until after first paint — non-critical for startup
const ric = globalThis.requestIdleCallback || ((cb) => setTimeout(cb, 50))
ric(
  () => import('./services/db-adapter.service').then(m => m.initDatabase()).catch(e => console.warn('[DB] Database init failed, using fallback:', e)),
  { timeout: 2000 },
)
