/**
 * Unified Database Adapter
 *
 * Provides a single interface that routes to:
 * - Native SQLite (@capacitor-community/sqlite) on Android/iOS
 * - IndexedDB (existing sqlite.service.js) on Web/Desktop
 *
 * This adapter allows the rest of the app to work with a single API
 * regardless of the platform, enabling incremental migration.
 *
 * The existing IndexedDB layer is NOT removed — it continues to work
 * as a fallback and will be phased out gradually.
 */

import { isNativePlatform, initNativeSQLite, isInitialized as isNativeReady } from './sqlite-native.service'
import { initDB as initIndexedDB } from './sqlite.service'

let _backend = 'indexeddb' // 'sqlite' | 'indexeddb'
let _ready = false

/**
 * Initialize the appropriate database backend
 */
export async function initDatabase() {
  if (_ready) return _backend

  if (isNativePlatform()) {
    const ok = await initNativeSQLite()
    if (ok) {
      _backend = 'sqlite'
      _ready = true
      if (import.meta.env.DEV) console.log('[DBAdapter] Using native SQLite backend')
      // Also init IndexedDB as secondary fallback during migration
      await initIndexedDB().catch(() => {})
      // Run IndexedDB → SQLite migration if needed (non-blocking)
      import('./idb-migration.service').then(m => m.runMigrationIfNeeded()).catch(() => {})
      return _backend
    }
  }

  // Fallback to IndexedDB (existing behavior)
  await initIndexedDB()
  _backend = 'indexeddb'
  _ready = true
  if (import.meta.env.DEV) console.log('[DBAdapter] Using IndexedDB backend')
  return _backend
}

/**
 * Get the current backend type
 */
export function getBackend() {
  return _backend
}

/**
 * Check if we're using native SQLite
 */
export function isUsingSQLite() {
  return _backend === 'sqlite' && _ready
}

/**
 * Check if the database is ready
 */
export function isDatabaseReady() {
  return _ready
}

/**
 * Parse JSON data field from SQLite row, merging with row columns
 */
export function parseRowData(row) {
  if (!row) return null
  const result = { ...row }
  if (typeof result.data === 'string') {
    try {
      const parsed = JSON.parse(result.data)
      Object.assign(result, parsed)
    } catch { /* keep raw */ }
  }
  delete result._deleted
  return result
}

/**
 * Prepare a record for SQLite storage.
 * Extracts known columns and serializes the rest into the `data` JSON field.
 */
export function prepareForStorage(record, knownColumns) {
  const row = {}
  const extra = {}

  for (const [key, value] of Object.entries(record)) {
    if (knownColumns.includes(key)) {
      row[key] = value
    } else {
      extra[key] = value
    }
  }

  if (Object.keys(extra).length > 0) {
    row.data = JSON.stringify(extra)
  }

  row._mod = Date.now()
  row.updated_at = new Date().toISOString()

  return row
}
