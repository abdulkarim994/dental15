/**
 * Data Migration Service
 *
 * Handles schema versioning and automatic data migration.
 * Each migration function transforms data from version N to N+1.
 * Migrations are applied sequentially and idempotently on app load.
 *
 * Current version: 1
 */

const DATA_VERSION_KEY = 'dental_data_version'
const CURRENT_VERSION = 1

export function getDataVersion() {
  try {
    return Number(localStorage.getItem(DATA_VERSION_KEY)) || 0
  } catch {
    return 0
  }
}

function setDataVersion(v) {
  try {
    localStorage.setItem(DATA_VERSION_KEY, String(v))
  } catch { /* non-critical */ }
}

/**
 * Migration from v0 (unversioned) to v1:
 * - Normalize debt objects: ensure both totalAmount and total exist
 * - Ensure remaining = max(0, totalAmount - paidAmount)
 */
function migrateV0toV1(data) {
  const { records, prosthetics, debts, config, appointments } = data

  const migratedDebts = (debts || []).map(d => {
    const totalAmount = Number(d.totalAmount || d.total) || 0
    const paidAmount = Number(d.paidAmount) || 0
    const remaining = Math.max(0, totalAmount - paidAmount)
    let status = d.status || 'unpaid'
    if (remaining <= 0.01 && paidAmount > 0) status = 'paid'
    else if (paidAmount > 0.01 && remaining > 0.01) status = 'partial'

    return {
      ...d,
      totalAmount,
      total: totalAmount,
      paidAmount,
      remaining,
      status,
    }
  })

  return {
    records: records || [],
    prosthetics: prosthetics || [],
    debts: migratedDebts,
    config: config || {},
    appointments: appointments || [],
  }
}

const MIGRATIONS = [
  migrateV0toV1,
]

/**
 * Run all pending migrations on the provided data.
 * Returns the migrated data and updates the stored version.
 */
export function migrateData(data) {
  let version = getDataVersion()

  if (version >= CURRENT_VERSION) return data

  let result = { ...data }
  for (let v = version; v < CURRENT_VERSION; v++) {
    const migrationFn = MIGRATIONS[v]
    if (migrationFn) {
      try {
        result = migrationFn(result)
      } catch (e) {
        console.error(`[Migration] v${v} → v${v + 1} failed:`, e)
        break
      }
    }
  }

  setDataVersion(CURRENT_VERSION)
  return result
}

export { CURRENT_VERSION }
