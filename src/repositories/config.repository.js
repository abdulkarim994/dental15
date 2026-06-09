/**
 * Config Repository — Phase 6
 *
 * Provides unified access for clinic configuration data across
 * both SQLite (native) and IndexedDB (web) backends.
 */

import { isDatabaseReady, getBackend } from '@/services/db-adapter.service'
import * as idb from '@/services/sqlite.service'

const CONFIG_STORE = 'metadata'
const CONFIG_KEY = 'clinic_config'

export const configRepository = {
  async getConfig() {
    if (!isDatabaseReady()) return null
    try {
      const db = await idb.openDB()
      const tx = db.transaction(CONFIG_STORE, 'readonly')
      const store = tx.objectStore(CONFIG_STORE)
      const req = store.get(CONFIG_KEY)
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result?.data || null)
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },

  async saveConfig(config) {
    if (!isDatabaseReady()) return false
    try {
      const db = await idb.openDB()
      const tx = db.transaction(CONFIG_STORE, 'readwrite')
      const store = tx.objectStore(CONFIG_STORE)
      store.put({ id: CONFIG_KEY, data: config, _mod: Date.now() })
      return true
    } catch {
      return false
    }
  },
}
