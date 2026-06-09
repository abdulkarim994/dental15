/**
 * Patients Local Repository
 *
 * Provides offline-first CRUD for patient data.
 * On native: uses SQLite with full-text search capability.
 * On web: delegates to IndexedDB via the base repository.
 *
 * Supabase remains the source of truth — this is a local cache layer.
 */

import { BaseRepository } from './base.repository'
import { isUsingSQLite, parseRowData } from '@/services/db-adapter.service'
import * as native from '@/services/sqlite-native.service'

const COLUMNS = [
  'id', 'name', 'phone', 'notes', 'last_visit',
  'created_at', 'updated_at', '_mod', '_deleted', 'data',
]

class PatientsRepository extends BaseRepository {
  constructor() {
    super('patients', COLUMNS)
  }

  /**
   * Search patients by name (fuzzy on IDB, LIKE on SQLite)
   */
  async searchByName(query) {
    if (!query || !query.trim()) return this.getAll()

    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM patients WHERE _deleted = 0 AND name LIKE ? ORDER BY last_visit DESC`,
        [`%${query.trim()}%`],
      )
      return rows.map(parseRowData)
    }

    // IndexedDB fallback: get all and filter in JS
    const all = await this.getAll()
    const q = query.trim().toLowerCase()
    return all.filter(p => (p.name || '').toLowerCase().includes(q))
  }

  /**
   * Get patients with recent visits (for dashboard)
   */
  async getRecentPatients(limit = 20) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM patients WHERE _deleted = 0 ORDER BY last_visit DESC LIMIT ?`,
        [limit],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all
      .sort((a, b) => (b.last_visit || '').localeCompare(a.last_visit || ''))
      .slice(0, limit)
  }

  /**
   * Cache patients from Supabase data (records/prosthetics).
   * This builds a patient map from records, matching the existing logic
   * in cache.service.js but storing in the repository layer.
   */
  async cacheFromRecords(records, prosthetics) {
    const patientMap = new Map()
    const allRecs = [...(records || []), ...(prosthetics || [])]

    for (const r of allRecs) {
      if (!r.name?.trim()) continue
      const name = r.name.trim()
      const existing = patientMap.get(name) || {
        id: name,
        name,
        last_visit: null,
        _mod: 0,
      }

      if (!existing.last_visit || (r.date && r.date > existing.last_visit)) {
        existing.last_visit = r.date
      }

      const mod = Number(r._mod || 0) || 0
      if (mod > existing._mod) existing._mod = mod

      patientMap.set(name, existing)
    }

    const patients = [...patientMap.values()]
    if (patients.length) {
      await this.bulkUpsert(patients)
    }
    return patients
  }

  /**
   * Get the total number of patients
   */
  async count() {
    if (isUsingSQLite()) {
      const result = await native.queryFirst(
        'SELECT COUNT(*) as cnt FROM patients WHERE _deleted = 0',
      )
      return result?.cnt || 0
    }

    const all = await this.getAll()
    return all.length
  }

}

export const patientsRepo = new PatientsRepository()
