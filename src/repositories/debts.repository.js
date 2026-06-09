/**
 * Debts Repository
 *
 * Provides unified CRUD access for debt records across both
 * SQLite (native) and IndexedDB (web) backends.
 * Components and stores should use this instead of direct DB access.
 */

import { BaseRepository } from './base.repository'
import { isUsingSQLite, parseRowData } from '@/services/db-adapter.service'
import * as native from '@/services/sqlite-native.service'

const COLUMNS = [
  'id', 'patient_name', 'total_amount', 'paid_amount', 'remaining',
  'status', 'created_at', 'updated_at', '_mod', '_deleted', 'data',
]

class DebtsRepository extends BaseRepository {
  constructor() {
    super('debts', COLUMNS)
  }

  async getUnpaidDebts() {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM debts WHERE _deleted = 0 AND status != 'paid' ORDER BY updated_at DESC`,
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all.filter(d => d.status !== 'paid' && !d._deleted)
  }

  async getDebtsByPatient(patientName) {
    if (isUsingSQLite()) {
      const rows = await native.query(
        `SELECT * FROM debts WHERE _deleted = 0 AND patient_name = ? ORDER BY updated_at DESC`,
        [patientName],
      )
      return rows.map(parseRowData)
    }

    const all = await this.getAll()
    return all.filter(d => (d.name === patientName || d.patient_name === patientName) && !d._deleted)
  }

  async markAsPaid(id) {
    const debt = await this.getById(id)
    if (!debt) return null
    return this.upsert({ ...debt, id, status: 'paid', _mod: Date.now() })
  }

  async addPayment(id, amount) {
    const debt = await this.getById(id)
    if (!debt) return null
    const paidAmount = (Number(debt.paidAmount || debt.paid_amount) || 0) + Number(amount)
    const remaining = (Number(debt.totalAmount || debt.total_amount || debt.total) || 0) - paidAmount
    const updated = {
      ...debt,
      id,
      paidAmount,
      paid_amount: paidAmount,
      remaining: Math.max(0, remaining),
      _mod: Date.now(),
    }
    if (remaining <= 0) updated.status = 'paid'
    return this.upsert(updated)
  }
}

export const debtsRepository = new DebtsRepository()
