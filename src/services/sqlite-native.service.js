/**
 * SQLite Native Service
 * Uses @capacitor-community/sqlite on native platforms (Android/iOS).
 * Provides a structured relational offline cache with proper schema management.
 *
 * This is the native counterpart to the existing IndexedDB-based sqlite.service.js.
 * On web, the system falls back to IndexedDB via db-adapter.service.js.
 */

import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'dental_clinic_offline'
const DB_VERSION = 2

let _sqlite = null
let _db = null
let _initialized = false

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  last_visit TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  _mod INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_name TEXT,
  date TEXT,
  time TEXT,
  service TEXT,
  clinic TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  _mod INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_appts_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appts_patient ON appointments(patient_name);

CREATE TABLE IF NOT EXISTS xrays (
  id TEXT PRIMARY KEY,
  patient_name TEXT,
  file_key TEXT,
  thumbnail_data TEXT,
  upload_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  _mod INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_xrays_patient ON xrays(patient_name);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  patient_name TEXT,
  date TEXT,
  service TEXT,
  amount REAL DEFAULT 0,
  clinic TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  _mod INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_patient ON records(patient_name);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  patient_name TEXT,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  remaining REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  _mod INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  data TEXT
);

CREATE INDEX IF NOT EXISTS idx_debts_patient ON debts(patient_name);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  user_id TEXT,
  data TEXT,
  status TEXT DEFAULT 'pending',
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  last_attempt TEXT,
  error_msg TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_queue(user_id);

CREATE TABLE IF NOT EXISTS pending_uploads (
  id TEXT PRIMARY KEY,
  file_key TEXT NOT NULL,
  patient_name TEXT,
  file_path TEXT,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  status TEXT DEFAULT 'pending',
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  last_attempt TEXT,
  error_msg TEXT
);

CREATE INDEX IF NOT EXISTS idx_uploads_status ON pending_uploads(status);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  user_id TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_meta_user ON sync_meta(user_id);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
`

/**
 * Check if running on a native platform that supports SQLite
 */
export function isNativePlatform() {
  return Capacitor.isNativePlatform()
}

/**
 * Initialize the SQLite connection and create/upgrade the database schema
 */
export async function initNativeSQLite() {
  if (_initialized) return true
  if (!isNativePlatform()) return false

  try {
    _sqlite = new SQLiteConnection(CapacitorSQLite)

    const ret = await _sqlite.checkConnectionsConsistency()
    const isConn = (await _sqlite.isConnection(DB_NAME, false)).result

    if (ret.result && isConn) {
      _db = await _sqlite.retrieveConnection(DB_NAME, false)
    } else {
      _db = await _sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
    }

    await _db.open()

    const statements = SCHEMA_SQL.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      await _db.execute(stmt + ';')
    }

    // Crash recovery: reset any items stuck in 'in_progress' status
    await _recoverFromCrash()

    _initialized = true
    if (import.meta.env.DEV) console.log('[SQLiteNative] Database initialized successfully')
    return true
  } catch (e) {
    console.error('[SQLiteNative] Init failed:', e)
    _initialized = false
    return false
  }
}

/**
 * Execute a raw SQL statement (INSERT, UPDATE, DELETE)
 */
export async function execute(sql, params = []) {
  if (!_db) throw new Error('[SQLiteNative] DB not initialized')
  return _db.run(sql, params)
}

/**
 * Execute a query and return all rows
 */
export async function query(sql, params = []) {
  if (!_db) throw new Error('[SQLiteNative] DB not initialized')
  const result = await _db.query(sql, params)
  return result.values || []
}

/**
 * Execute a query and return first row or null
 */
export async function queryFirst(sql, params = []) {
  const rows = await query(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Run multiple statements in a transaction
 */
export async function transaction(statements) {
  if (!_db) throw new Error('[SQLiteNative] DB not initialized')

  const set = statements.map(s => ({
    statement: s.sql,
    values: s.params || [],
  }))

  return _db.executeSet(set, true)
}

/**
 * Upsert a record into a table.
 * The `data` field stores the full JSON blob for fields not in the schema.
 */
export async function upsertRecord(table, record, columns) {
  const cols = columns.filter(c => record[c] !== undefined)
  const placeholders = cols.map(() => '?').join(', ')
  const updates = cols
    .filter(c => c !== 'id')
    .map(c => `${c} = ?`)
    .join(', ')
  const values = cols.map(c => {
    const v = record[c]
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v
  })
  const updateValues = cols
    .filter(c => c !== 'id')
    .map(c => {
      const v = record[c]
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    })

  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}`

  return execute(sql, [...values, ...updateValues])
}

/**
 * Bulk upsert records inside a transaction
 */
export async function bulkUpsert(table, records, columns) {
  if (!records.length) return

  const stmts = records.map(record => {
    const cols = columns.filter(c => record[c] !== undefined)
    const placeholders = cols.map(() => '?').join(', ')
    const updates = cols
      .filter(c => c !== 'id')
      .map(c => `${c} = ?`)
      .join(', ')
    const values = cols.map(c => {
      const v = record[c]
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    })
    const updateValues = cols
      .filter(c => c !== 'id')
      .map(c => {
        const v = record[c]
        return typeof v === 'object' && v !== null ? JSON.stringify(v) : v
      })

    return {
      sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
        ON CONFLICT(id) DO UPDATE SET ${updates}`,
      params: [...values, ...updateValues],
    }
  })

  return transaction(stmts)
}

/**
 * Soft-delete a record by setting _deleted = 1
 */
export async function softDelete(table, id) {
  return execute(
    `UPDATE ${table} SET _deleted = 1, updated_at = datetime('now') WHERE id = ?`,
    [id],
  )
}

/**
 * Get all non-deleted records from a table
 */
export async function getAll(table, orderBy = 'updated_at DESC') {
  return query(`SELECT * FROM ${table} WHERE _deleted = 0 ORDER BY ${orderBy}`)
}

/**
 * Get a single record by ID
 */
export async function getById(table, id) {
  return queryFirst(`SELECT * FROM ${table} WHERE id = ? AND _deleted = 0`, [id])
}

/**
 * Get records modified after a certain timestamp
 */
export async function getModifiedSince(table, timestamp) {
  return query(
    `SELECT * FROM ${table} WHERE _mod > ? ORDER BY _mod ASC`,
    [timestamp],
  )
}

/**
 * Close the database connection
 */
export async function closeDB() {
  if (_db) {
    await _db.close()
    await _sqlite.closeConnection(DB_NAME, false)
    _db = null
    _initialized = false
  }
}

/**
 * Get database initialization status
 */
export function isInitialized() {
  return _initialized
}

// ── Crash Recovery ──

async function _recoverFromCrash() {
  try {
    // Reset sync_queue items that were in_progress when the app crashed
    await _db.run(
      `UPDATE sync_queue SET status = 'pending', retries = retries + 1
       WHERE status = 'in_progress'`,
      [],
    )

    // Reset pending_uploads that were in_progress
    await _db.run(
      `UPDATE pending_uploads SET status = 'pending', retries = retries + 1
       WHERE status = 'in_progress'`,
      [],
    )

    const recovered = await query(
      `SELECT COUNT(*) as cnt FROM sync_queue WHERE retries > 0 AND status = 'pending'`,
    )
    if (recovered[0]?.cnt > 0) {
      if (import.meta.env.DEV) console.log(`[SQLiteNative] Recovered ${recovered[0].cnt} items from crash`)
    }
  } catch (e) {
    console.warn('[SQLiteNative] Crash recovery check failed:', e)
  }
}

// ── Sync Meta Helpers ──

export async function setSyncMeta(key, value, userId = '') {
  if (!_db) throw new Error('[SQLiteNative] DB not initialized')
  return _db.run(
    `INSERT INTO sync_meta (key, value, user_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
    [key, typeof value === 'object' ? JSON.stringify(value) : String(value), userId,
     typeof value === 'object' ? JSON.stringify(value) : String(value)],
  )
}

export async function getSyncMeta(key) {
  if (!_db) return null
  const row = await queryFirst(`SELECT value FROM sync_meta WHERE key = ?`, [key])
  if (!row) return null
  try { return JSON.parse(row.value) } catch { return row.value }
}

// ── Pending Uploads ──

export async function addPendingUpload(upload) {
  if (!_db) throw new Error('[SQLiteNative] DB not initialized')
  return _db.run(
    `INSERT OR REPLACE INTO pending_uploads
     (id, file_key, patient_name, file_path, file_size, mime_type, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [upload.id, upload.file_key, upload.patient_name || '',
     upload.file_path || '', upload.file_size || 0, upload.mime_type || ''],
  )
}

export async function getPendingUploads() {
  return query(
    `SELECT * FROM pending_uploads WHERE status = 'pending' ORDER BY created_at ASC`,
  )
}

export async function markUploadComplete(id) {
  return execute(`DELETE FROM pending_uploads WHERE id = ?`, [id])
}

export async function failUpload(id, errorMsg = '') {
  const item = await queryFirst(`SELECT * FROM pending_uploads WHERE id = ?`, [id])
  if (!item) return
  const newRetries = (item.retries || 0) + 1
  if (newRetries >= (item.max_retries || 5)) {
    return execute(
      `UPDATE pending_uploads SET status = 'failed', retries = ?, error_msg = ?, last_attempt = datetime('now') WHERE id = ?`,
      [newRetries, errorMsg, id],
    )
  }
  return execute(
    `UPDATE pending_uploads SET retries = ?, error_msg = ?, last_attempt = datetime('now') WHERE id = ?`,
    [newRetries, errorMsg, id],
  )
}
