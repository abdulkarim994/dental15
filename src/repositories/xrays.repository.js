/**
 * X-Ray Images Local Repository
 *
 * Manages offline-first storage for X-ray image metadata and thumbnails.
 * Full images are stored in Cloudflare R2; only metadata and thumbnails
 * are cached locally for offline access and performance.
 *
 * On native: uses SQLite for metadata, stores thumbnail blobs efficiently.
 * On web: delegates to IndexedDB (thumbnails store in existing sqlite.service.js).
 */

import { BaseRepository } from './base.repository'
import { isUsingSQLite, parseRowData } from '@/services/db-adapter.service'
import * as native from '@/services/sqlite-native.service'
import { cacheThumbnail, getCachedThumbnail, removeCachedThumbnail } from '@/services/sqlite.service'

const COLUMNS = [
  'id', 'patient_name', 'file_key', 'thumbnail_data',
  'upload_status', 'created_at', '_mod', '_deleted', 'data',
]

class XraysRepository extends BaseRepository {
  constructor() {
    super('xrays', COLUMNS)
  }

  /**
   * Get all xrays for a specific patient
   */
  async getByPatient(patientName) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM xrays WHERE _deleted = 0 AND patient_name = ? ORDER BY created_at DESC`,
        [patientName],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all.filter(x => x.patient_name === patientName)
  }

  /**
   * Store a thumbnail for an xray
   */
  async saveThumbnail(fileKey, thumbnailDataUrl) {
    if (isUsingSQLite()) {
      return native.execute(
        `UPDATE xrays SET thumbnail_data = ?, _mod = ? WHERE file_key = ?`,
        [thumbnailDataUrl, Date.now(), fileKey],
      )
    }

    return cacheThumbnail(fileKey, thumbnailDataUrl)
  }

  /**
   * Get a thumbnail for an xray
   */
  async getThumbnail(fileKey) {
    if (isUsingSQLite()) {
      const row = await native.queryFirst(
        `SELECT thumbnail_data FROM xrays WHERE file_key = ? AND _deleted = 0`,
        [fileKey],
      )
      return row?.thumbnail_data || null
    }

    return getCachedThumbnail(fileKey)
  }

  /**
   * Remove a thumbnail
   */
  async removeThumbnail(fileKey) {
    if (isUsingSQLite()) {
      return native.execute(
        `UPDATE xrays SET thumbnail_data = NULL, _mod = ? WHERE file_key = ?`,
        [Date.now(), fileKey],
      )
    }

    return removeCachedThumbnail(fileKey)
  }

  /**
   * Get xrays that haven't been uploaded yet (for retry)
   */
  async getPendingUploads() {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM xrays WHERE _deleted = 0 AND upload_status = 'pending' ORDER BY created_at ASC`,
      )
      return rows.map(parseRowData)
    }

    // IndexedDB fallback: get all and filter
    const all = await this.getAll()
    return all.filter(x => x.upload_status === 'pending')
  }

  /**
   * Mark an xray as uploaded successfully
   */
  async markUploaded(id) {
    if (isUsingSQLite()) {
      return native.execute(
        `UPDATE xrays SET upload_status = 'uploaded', _mod = ? WHERE id = ?`,
        [Date.now(), id],
      )
    }

    const record = await this.getById(id)
    if (record) {
      record.upload_status = 'uploaded'
      await this.upsert(record)
    }
  }

  /**
   * Add an xray entry with metadata
   */
  async addXray(patientName, fileKey, thumbnailData = null) {
    const xray = {
      id: fileKey,
      patient_name: patientName,
      file_key: fileKey,
      thumbnail_data: thumbnailData,
      upload_status: 'pending',
      created_at: new Date().toISOString(),
      _mod: Date.now(),
    }

    await this.upsert(xray)
    return xray
  }

  /**
   * Clean up thumbnails that are older than maxAge (in ms)
   */
  async cleanupOldThumbnails(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs

    if (isUsingSQLite()) {
      return native.execute(
        `UPDATE xrays SET thumbnail_data = NULL WHERE _mod < ? AND thumbnail_data IS NOT NULL`,
        [cutoff],
      )
    }
    // No cleanup for IndexedDB in this migration step
  }

  /**
   * Count xrays for a patient
   */
  async countByPatient(patientName) {
    if (isUsingSQLite()) {
      const result = await native.queryFirst(
        'SELECT COUNT(*) as cnt FROM xrays WHERE _deleted = 0 AND patient_name = ?',
        [patientName],
      )
      return result?.cnt || 0
    }

    const all = await this.getAll()
    return all.filter(x => x.patient_name === patientName).length
  }

}

export const xraysRepo = new XraysRepository()
