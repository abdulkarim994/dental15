const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch])
}

export function sanitizeInput(val) {
  if (typeof val !== 'string') return val
  // Multi-pass to catch nested/encoded payloads
  let s = val
  let prev = ''
  for (let pass = 0; pass < 3 && s !== prev; pass++) {
    prev = s
    s = s
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/script>/gi, '')
      .replace(/<script\b[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?(<\/iframe>)?/gi, '')
      .replace(/<object[^>]*>[\s\S]*?(<\/object>)?/gi, '')
      .replace(/<embed[^>]*\/?>/gi, '')
      .replace(/<form[^>]*>[\s\S]*?(<\/form>)?/gi, '')
      .replace(/<img[^>]*>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?(<\/svg>)?/gi, '')
      .replace(/<svg[^>]*>/gi, '')
      .replace(/<math[^>]*>[\s\S]*?(<\/math>)?/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?(<\/style>)?/gi, '')
      .replace(/<base[^>]*>/gi, '')
      .replace(/<video[^>]*>[\s\S]*?(<\/video>)?/gi, '')
      .replace(/<audio[^>]*>[\s\S]*?(<\/audio>)?/gi, '')
      .replace(/<input[^>]*>/gi, '')
      .replace(/<textarea[^>]*>[\s\S]*?(<\/textarea>)?/gi, '')
      .replace(/<button[^>]*>[\s\S]*?(<\/button>)?/gi, '')
      .replace(/<select[^>]*>[\s\S]*?(<\/select>)?/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(\s*["']?javascript/gi, '')
      .replace(/-moz-binding\s*:/gi, '')
      .replace(/behavior\s*:/gi, '')
  }
  return s.trim()
}

export function sanitizeRecord(record) {
  if (!record || typeof record !== 'object') return record
  const sanitized = { ...record }
  const textFields = ['name', 'notes', 'diagnosis', 'service', 'clinic', 'phone']
  for (const f of textFields) {
    if (typeof sanitized[f] === 'string') {
      sanitized[f] = sanitizeInput(sanitized[f])
    }
  }
  if (typeof sanitized.amount === 'string') {
    sanitized.amount = Number(sanitized.amount) || 0
  }
  return sanitized
}

export function sanitizeDebt(debt) {
  if (!debt || typeof debt !== 'object') return debt
  const sanitized = { ...debt }
  const textFields = ['name', 'notes', 'service', 'phone']
  for (const f of textFields) {
    if (typeof sanitized[f] === 'string') {
      sanitized[f] = sanitizeInput(sanitized[f])
    }
  }
  for (const numField of ['totalAmount', 'total', 'paidAmount', 'remaining']) {
    if (numField in sanitized && typeof sanitized[numField] === 'string') {
      sanitized[numField] = Number(sanitized[numField]) || 0
    }
  }
  const canonical = Number(sanitized.totalAmount || sanitized.total) || 0
  sanitized.totalAmount = canonical
  sanitized.total = canonical
  return sanitized
}

export function sanitizeAppointment(appt) {
  if (!appt || typeof appt !== 'object') return appt
  const sanitized = { ...appt }
  const textFields = ['name', 'notes', 'service', 'phone']
  for (const f of textFields) {
    if (typeof sanitized[f] === 'string') {
      sanitized[f] = sanitizeInput(sanitized[f])
    }
  }
  if (sanitized.date && typeof sanitized.date === 'string') {
    sanitized.date = sanitized.date.replace(/[^0-9\-]/g, '').substring(0, 10)
  }
  if (sanitized.time && typeof sanitized.time === 'string') {
    sanitized.time = sanitized.time.replace(/[^0-9:]/g, '').substring(0, 5)
  }
  return sanitized
}

export function validatePhone(phone) {
  if (!phone) return true
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^[+]?\d{6,15}$/.test(cleaned)
}

export function validateAmount(amount) {
  const num = Number(amount)
  return !isNaN(num) && num >= 0 && num < 1e9
}

export function validateRecords(data) {
  if (!Array.isArray(data)) return []
  return data.filter(r => r && r.id && r.date && r.name)
}

export function validateDebts(data) {
  if (!Array.isArray(data)) return []
  return data.filter(d => d && d.id && d.name)
}

export function validateAppointments(data) {
  if (!Array.isArray(data)) return []
  return data.filter(a => a && a.id && a.date)
}

export function validateConfig(config) {
  if (!config || typeof config !== 'object') return null
  const clean = { ...config }
  if (clean.centerName && typeof clean.centerName === 'string') {
    clean.centerName = sanitizeInput(clean.centerName)
  }
  if (clean.syncMin !== undefined) {
    clean.syncMin = Math.max(1, Math.min(Number(clean.syncMin) || 30, 1440))
  }
  if (clean.doctorPct !== undefined) {
    clean.doctorPct = Math.max(0, Math.min(Number(clean.doctorPct) || 50, 100))
  }
  if (clean.doctorPctRegular !== undefined) {
    clean.doctorPctRegular = Math.max(0, Math.min(Number(clean.doctorPctRegular) || 50, 100))
  }
  if (Array.isArray(clean.clinics)) {
    clean.clinics = clean.clinics.map(c => typeof c === 'string' ? sanitizeInput(c) : c)
  }
  if (Array.isArray(clean.services)) {
    clean.services = clean.services.map(s => typeof s === 'string' ? sanitizeInput(s) : s)
  }
  return clean
}

/**
 * Sanitize an email address.
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+\-]/g, '').substring(0, 254)
}

/**
 * Deep sanitize all string values in an object.
 */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function deepSanitize(obj) {
  if (typeof obj === 'string') return sanitizeInput(obj)
  if (Array.isArray(obj)) return obj.map(deepSanitize)
  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [key, val] of Object.entries(obj)) {
      if (BLOCKED_KEYS.has(key)) continue
      result[key] = deepSanitize(val)
    }
    return result
  }
  return obj
}
