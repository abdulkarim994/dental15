/**
 * Base Repository
 *
 * Abstract base for local repositories that use the dual-backend DB adapter.
 * Provides common CRUD operations with automatic platform routing:
 * - Native SQLite on Android/iOS
 * - IndexedDB on Web/Desktop
 *
 * Each repository extends this base and defines its own table/store name,
 * known columns, and any custom query methods.
 */

import { isUsingSQLite, isDatabaseReady, parseRowData, prepareForStorage } from '@/services/db-adapter.service'
import * as native from '@/services/sqlite-native.service'
import * as idb from '@/services/sqlite.service'

export class BaseRepository {
  /**
   * @param {string} tableName - SQLite table name / IndexedDB store name
   * @param {string[]} knownColumns - columns that exist in the SQLite schema
   */
  constructor(tableName, knownColumns) {
    this.tableName = tableName
    this.knownColumns = knownColumns
  }

  /**
   * Get all non-deleted records
   */
  async getAll() {
    if (isUsingSQLite()) {
      const rows = await native.getAll(this.tableName)
      return rows.map(parseRowData)
    }
    return this._idbGetAll()
  }

  /**
   * Get a single record by ID
   */
  async getById(id) {
    if (isUsingSQLite()) {
      const row = await native.getById(this.tableName, id)
      return parseRowData(row)
    }
    return this._idbGet(id)
  }

  /**
   * Insert or update a single record
   */
  async upsert(record) {
    if (!record.id) return

    if (isUsingSQLite()) {
      const row = prepareForStorage(record, this.knownColumns)
      return native.upsertRecord(this.tableName, row, this.knownColumns)
    }
    return this._idbPut(record)
  }

  /**
   * Partial update: merges updates into existing record then upserts.
   */
  async update(id, updates) {
    const existing = await this.getById(id)
    if (!existing) return null
    return this.upsert({ ...existing, ...updates, id })
  }

  /**
   * Bulk insert/update records
   */
  async bulkUpsert(records) {
    if (!records.length) return

    if (isUsingSQLite()) {
      const rows = records
        .filter(r => r.id)
        .map(r => prepareForStorage(r, this.knownColumns))
      return native.bulkUpsert(this.tableName, rows, this.knownColumns)
    }
    return this._idbBulkPut(records)
  }

  /**
   * Soft-delete a record (marks _deleted = 1 in SQLite, removes from IndexedDB)
   */
  async delete(id) {
    if (isUsingSQLite()) {
      return native.softDelete(this.tableName, id)
    }
    return this._idbDelete(id)
  }

  /**
   * Get records modified after a certain timestamp (for sync)
   */
  async getModifiedSince(timestamp) {
    if (isUsingSQLite()) {
      const rows = await native.getModifiedSince(this.tableName, timestamp)
      return rows.map(parseRowData)
    }
    // IndexedDB fallback: return all (no _mod index in IDB currently)
    const all = await this._idbGetAll()
    return all.filter(r => (r._mod || 0) > timestamp)
  }

  /**
   * Get total count of non-deleted records
   */
  async count() {
    if (isUsingSQLite()) {
      const result = await native.queryFirst(
        `SELECT COUNT(*) as cnt FROM ${this.tableName} WHERE _deleted = 0`,
      )
      return result?.cnt || 0
    }
    const all = await this.getAll()
    return all.length
  }

  // ── IndexedDB fallback methods (delegate to existing sqlite.service.js) ──

  async _idbGetAll() {
    const store = await idb.getStore(this.tableName)
    return idb.promisifyRequest(store.getAll())
  }

  async _idbGet(id) {
    const store = await idb.getStore(this.tableName)
    return idb.promisifyRequest(store.get(id))
  }

  async _idbPut(record) {
    const store = await idb.getStore(this.tableName, 'readwrite')
    return idb.promisifyRequest(store.put(record))
  }

  async _idbBulkPut(records) {
    const db = await idb.openDB()
    const tx = db.transaction(this.tableName, 'readwrite')
    const store = tx.objectStore(this.tableName)
    for (const r of records) {
      if (r.id) store.put(r)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  }

  async _idbDelete(id) {
    const store = await idb.getStore(this.tableName, 'readwrite')
    return idb.promisifyRequest(store.delete(id))
  }
}
