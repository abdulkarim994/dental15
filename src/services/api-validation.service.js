/**
 * API Validation Layer — Phase 5
 *
 * Validates data before it reaches Supabase or local storage.
 * Acts as a guard layer between the app and data persistence.
 *
 * - Validates required fields
 * - Enforces data type constraints
 * - Rejects malformed payloads
 * - Sanitizes all string fields
 */

import { sanitizeInput, validatePhone, validateAmount } from '@/utils/sanitize'

const MAX_STRING_LENGTH = 500
const MAX_NOTES_LENGTH = 2000
const MAX_ARRAY_SIZE = 10000

/**
 * Validate and sanitize a record before persistence.
 */
export function validateRecordPayload(record) {
  const errors = []

  if (!record) return { valid: false, errors: ['Record is null'], data: null }
  if (!record.id) errors.push('Missing record ID')
  if (!record.date) errors.push('Missing date')
  if (!record.name || !record.name.trim()) errors.push('Missing patient name')

  if (record.name && record.name.length > MAX_STRING_LENGTH) {
    errors.push('Patient name too long')
  }

  if (record.amount !== undefined && !validateAmount(record.amount)) {
    errors.push('Invalid amount')
  }

  if (record.phone && !validatePhone(record.phone)) {
    errors.push('Invalid phone number')
  }

  if (record.date && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    errors.push('Invalid date format (expected YYYY-MM-DD)')
  }

  if (errors.length > 0) return { valid: false, errors, data: null }

  const sanitized = { ...record }
  _sanitizeStringFields(sanitized, ['name', 'notes', 'diagnosis', 'service', 'clinic', 'phone'])
  return { valid: true, errors: [], data: sanitized }
}

/**
 * Validate and sanitize a debt before persistence.
 */
export function validateDebtPayload(debt) {
  const errors = []

  if (!debt) return { valid: false, errors: ['Debt is null'], data: null }
  if (!debt.id) errors.push('Missing debt ID')
  if (!debt.name || !debt.name.trim()) errors.push('Missing patient name')

  for (const field of ['totalAmount', 'total', 'paidAmount', 'remaining']) {
    if (debt[field] !== undefined && !validateAmount(debt[field])) {
      errors.push(`Invalid ${field}`)
    }
  }

  if (debt.phone && !validatePhone(debt.phone)) {
    errors.push('Invalid phone number')
  }

  if (errors.length > 0) return { valid: false, errors, data: null }

  const sanitized = { ...debt }
  _sanitizeStringFields(sanitized, ['name', 'notes', 'service', 'phone'])
  return { valid: true, errors: [], data: sanitized }
}

/**
 * Validate and sanitize an appointment before persistence.
 */
export function validateAppointmentPayload(appt) {
  const errors = []

  if (!appt) return { valid: false, errors: ['Appointment is null'], data: null }
  if (!appt.id) errors.push('Missing appointment ID')
  if (!appt.date) errors.push('Missing date')

  if (appt.date && !/^\d{4}-\d{2}-\d{2}$/.test(appt.date)) {
    errors.push('Invalid date format')
  }

  if (appt.time && !/^\d{2}:\d{2}$/.test(appt.time)) {
    errors.push('Invalid time format (expected HH:MM)')
  }

  if (errors.length > 0) return { valid: false, errors, data: null }

  const sanitized = { ...appt }
  _sanitizeStringFields(sanitized, ['name', 'notes', 'service', 'phone'])
  return { valid: true, errors: [], data: sanitized }
}

/**
 * Validate a batch of items (records, debts, appointments).
 * Rejects the entire batch if it exceeds safe limits.
 */
export function validateBatchSize(items, label = 'items') {
  if (!Array.isArray(items)) return { valid: false, error: `${label} is not an array` }
  if (items.length > MAX_ARRAY_SIZE) {
    return { valid: false, error: `${label} exceeds maximum size (${MAX_ARRAY_SIZE})` }
  }
  return { valid: true, error: null }
}

/**
 * Validate config updates before persistence.
 */
export function validateConfigPayload(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config is null or not an object'], data: null }
  }

  const sanitized = { ...config }

  if (sanitized.centerName) {
    sanitized.centerName = sanitizeInput(String(sanitized.centerName)).substring(0, MAX_STRING_LENGTH)
  }

  if (sanitized.syncMin !== undefined) {
    sanitized.syncMin = Math.max(1, Math.min(Number(sanitized.syncMin) || 30, 1440))
  }

  if (sanitized.doctorPct !== undefined) {
    sanitized.doctorPct = Math.max(0, Math.min(Number(sanitized.doctorPct) || 50, 100))
  }
  if (sanitized.doctorPctRegular !== undefined) {
    sanitized.doctorPctRegular = Math.max(0, Math.min(Number(sanitized.doctorPctRegular) || 50, 100))
  }

  return { valid: true, errors: [], data: sanitized }
}

// ── Internal helpers ──

function _sanitizeStringFields(obj, fields) {
  for (const f of fields) {
    if (typeof obj[f] === 'string') {
      obj[f] = sanitizeInput(obj[f]).substring(0, f === 'notes' ? MAX_NOTES_LENGTH : MAX_STRING_LENGTH)
    }
  }
}
