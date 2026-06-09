/**
 * Appointments Local Repository
 *
 * Provides offline-first CRUD for appointment data.
 * Supports date-range queries on native SQLite.
 *
 * Supabase remains the source of truth — this is a local cache layer.
 */

import { BaseRepository } from './base.repository'
import { isUsingSQLite, parseRowData } from '@/services/db-adapter.service'
import * as native from '@/services/sqlite-native.service'

const COLUMNS = [
  'id', 'patient_name', 'date', 'time', 'service', 'clinic',
  'notes', 'status', 'created_at', 'updated_at', '_mod', '_deleted', 'data',
]

class AppointmentsRepository extends BaseRepository {
  constructor() {
    super('appointments', COLUMNS)
  }

  /**
   * Get appointments for a specific date
   */
  async getByDate(date) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM appointments WHERE _deleted = 0 AND date = ? ORDER BY time ASC`,
        [date],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all.filter(a => a.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  /**
   * Get appointments within a date range
   */
  async getByDateRange(startDate, endDate) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM appointments WHERE _deleted = 0 AND date >= ? AND date <= ? ORDER BY date ASC, time ASC`,
        [startDate, endDate],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all
      .filter(a => a.date >= startDate && a.date <= endDate)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  }

  /**
   * Get appointments for a specific patient
   */
  async getByPatient(patientName) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM appointments WHERE _deleted = 0 AND patient_name = ? ORDER BY date DESC`,
        [patientName],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all.filter(a => a.patient_name === patientName || a.name === patientName)
  }

  /**
   * Get upcoming appointments (today and future)
   */
  async getUpcoming(limit = 50) {
    const today = new Date().toISOString().substring(0, 10)

    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM appointments WHERE _deleted = 0 AND date >= ? ORDER BY date ASC, time ASC LIMIT ?`,
        [today, limit],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all
      .filter(a => a.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, limit)
  }

  /**
   * Cache appointments from Supabase.
   * Maps the existing appointment format to repository storage.
   */
  async cacheFromSupabase(appointments) {
    if (!appointments?.length) return

    const mapped = appointments.map(a => ({
      id: a.id,
      patient_name: a.name || a.patient_name,
      date: a.date,
      time: a.time,
      service: a.service,
      clinic: a.clinic,
      notes: a.notes,
      status: a.status || 'pending',
      _mod: a._mod || Date.now(),
      // store the full original object so no data is lost
      data: JSON.stringify(a),
    }))

    await this.bulkUpsert(mapped)
  }

  /**
   * Count appointments for a date
   */
  async countByDate(date) {
    if (isUsingSQLite()) {
      const result = await native.queryFirst(
        'SELECT COUNT(*) as cnt FROM appointments WHERE _deleted = 0 AND date = ?',
        [date],
      )
      return result?.cnt || 0
    }

    const all = await this.getAll()
    return all.filter(a => a.date === date).length
  }

}

export const appointmentsRepo = new AppointmentsRepository()
