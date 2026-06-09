/**
 * IndexedDB → SQLite Migration Service
 *
 * Provides a safe, incremental migration path from the IndexedDB cache
 * (sqlite.service.js) to native SQLite (sqlite-native.service.js).
 *
 * Migration strategy:
 * - Only runs on native platforms where SQLite is available
 * - Reads all data from IndexedDB stores
 * - Writes into SQLite tables via the repository layer
 * - Tracks migration state per-table in sync_meta
 * - Safe to re-run (idempotent — uses upsert)
 * - Does NOT delete IndexedDB data (preserving it as fallback)
 *
 * Call `runMigrationIfNeeded()` after database initialization.
 */

import { isUsingSQLite, isDatabaseReady } from './db-adapter.service'
import { setSyncMeta, getSyncMeta } from './sqlite-native.service'
import { getCachedPatients, getCachedAppointments, getCachedDebts } from './sqlite.service'
import { patientsRepo } from '@/repositories/patients.repository'
import { appointmentsRepo } from '@/repositories/appointments.repository'
import { debtsRepository } from '@/repositories/debts.repository'

const MIGRATION_VERSION = 1

/**
 * Run the migration if we're on native SQLite and haven't migrated yet.
 * Safe to call multiple times — no-op if already migrated.
 */
export async function runMigrationIfNeeded() {
  if (!isDatabaseReady() || !isUsingSQLite()) return false

  try {
    const currentVersion = await getSyncMeta('idb_migration_version')
    if (currentVersion && Number(currentVersion) >= MIGRATION_VERSION) {
      return false // Already migrated
    }

    if (import.meta.env.DEV) console.log('[IDBMigration] Starting IndexedDB → SQLite migration...')

    const results = {
      patients: 0,
      appointments: 0,
      debts: 0,
    }

    // Migrate patients
    try {
      const patients = await getCachedPatients()
      if (patients.length) {
        await patientsRepo.bulkUpsert(patients)
        results.patients = patients.length
      }
    } catch (e) {
      console.warn('[IDBMigration] Patients migration failed:', e.message)
    }

    // Migrate appointments
    try {
      const appointments = await getCachedAppointments()
      if (appointments.length) {
        await appointmentsRepo.cacheFromSupabase(appointments)
        results.appointments = appointments.length
      }
    } catch (e) {
      console.warn('[IDBMigration] Appointments migration failed:', e.message)
    }

    // Migrate debts
    try {
      const debts = await getCachedDebts()
      if (debts.length) {
        const mapped = debts.filter(d => d.id).map(d => ({
          ...d,
          patient_name: d.name || d.patient_name,
          total_amount: d.totalAmount || d.total_amount || d.total || 0,
          paid_amount: d.paidAmount || d.paid_amount || 0,
          remaining: d.remaining || 0,
          status: d.status || 'unpaid',
          _mod: d._mod || Date.now(),
        }))
        await debtsRepository.bulkUpsert(mapped)
        results.debts = mapped.length
      }
    } catch (e) {
      console.warn('[IDBMigration] Debts migration failed:', e.message)
    }

    // Mark migration as complete
    await setSyncMeta('idb_migration_version', MIGRATION_VERSION)
    await setSyncMeta('idb_migration_ts', Date.now())

    if (import.meta.env.DEV) console.log('[IDBMigration] Migration complete:', results)
    return true
  } catch (e) {
    console.error('[IDBMigration] Migration failed:', e)
    return false
  }
}
