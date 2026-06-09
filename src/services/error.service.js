/**
 * Centralized Error Service — Phase 6
 *
 * Unified error handling with classification and structured logging.
 * All errors flow through this service for consistent handling
 * without impacting performance.
 *
 * Error Categories:
 *   - network: connectivity and timeout errors
 *   - sync: data sync conflicts and failures
 *   - auth: authentication and session errors
 *   - db: local database (SQLite/IndexedDB) errors
 *   - validation: input validation errors
 *   - unknown: uncategorized errors
 */

const MAX_LOG_SIZE = 200
const _errorLog = []

export const ErrorCategory = {
  NETWORK: 'network',
  SYNC: 'sync',
  AUTH: 'auth',
  DB: 'db',
  VALIDATION: 'validation',
  IMAGE: 'image',
  UNKNOWN: 'unknown',
}

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

/**
 * Classify an error into a category based on its properties.
 */
export function classifyError(error) {
  if (!error) return ErrorCategory.UNKNOWN

  const msg = (error.message || '').toLowerCase()
  const code = error.code || ''

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') ||
      msg.includes('abort') || msg.includes('econnrefused') || msg.includes('offline') ||
      code === 'NETWORK_ERROR') {
    return ErrorCategory.NETWORK
  }

  if (msg.includes('sync') || msg.includes('conflict') || msg.includes('merge') ||
      msg.includes('dirty') || msg.includes('queue')) {
    return ErrorCategory.SYNC
  }

  if (msg.includes('auth') || msg.includes('token') || msg.includes('session') ||
      msg.includes('login') || msg.includes('refresh') || msg.includes('unauthorized') ||
      code === 'PGRST301' || error.status === 401 || error.status === 403) {
    return ErrorCategory.AUTH
  }

  if (msg.includes('indexeddb') || msg.includes('sqlite') || msg.includes('database') ||
      msg.includes('transaction') || msg.includes('objectstore') || msg.includes('idb')) {
    return ErrorCategory.DB
  }

  if (msg.includes('valid') || msg.includes('required') || msg.includes('format') ||
      msg.includes('sanitize')) {
    return ErrorCategory.VALIDATION
  }

  if (msg.includes('image') || msg.includes('blob') || msg.includes('canvas') ||
      msg.includes('compress') || msg.includes('r2') || msg.includes('upload')) {
    return ErrorCategory.IMAGE
  }

  return ErrorCategory.UNKNOWN
}

/**
 * Log an error with category and context metadata.
 * Keeps a rolling buffer to avoid memory growth.
 */
export function logError(error, context = {}) {
  const category = context.category || classifyError(error)
  const entry = {
    timestamp: Date.now(),
    category,
    severity: context.severity || ErrorSeverity.MEDIUM,
    message: error?.message || String(error),
    context: context.source || '',
    stack: error?.stack?.split('\n').slice(0, 3).join('\n') || '',
  }

  _errorLog.push(entry)
  if (_errorLog.length > MAX_LOG_SIZE) {
    _errorLog.splice(0, _errorLog.length - MAX_LOG_SIZE)
  }

  // Console output for development
  const prefix = `[${category.toUpperCase()}]`
  if (entry.severity === ErrorSeverity.CRITICAL || entry.severity === ErrorSeverity.HIGH) {
    console.error(prefix, entry.message, context.source || '')
  } else {
    console.warn(prefix, entry.message, context.source || '')
  }

  return entry
}

/**
 * Create a scoped error handler for a specific service/component.
 */
export function createErrorHandler(source) {
  return {
    log(error, extra = {}) {
      return logError(error, { source, ...extra })
    },
    wrap(fn) {
      return async (...args) => {
        try {
          return await fn(...args)
        } catch (e) {
          logError(e, { source })
          throw e
        }
      }
    },
    silent(fn) {
      return async (...args) => {
        try {
          return await fn(...args)
        } catch (e) {
          logError(e, { source, severity: ErrorSeverity.LOW })
          return null
        }
      }
    },
  }
}

/**
 * Get recent error log entries, optionally filtered.
 */
export function getErrorLog(filter = {}) {
  let entries = [..._errorLog]
  if (filter.category) entries = entries.filter(e => e.category === filter.category)
  if (filter.severity) entries = entries.filter(e => e.severity === filter.severity)
  if (filter.since) entries = entries.filter(e => e.timestamp >= filter.since)
  return entries
}

/**
 * Get error summary counts by category.
 */
export function getErrorSummary() {
  const summary = {}
  for (const cat of Object.values(ErrorCategory)) {
    summary[cat] = _errorLog.filter(e => e.category === cat).length
  }
  summary.total = _errorLog.length
  return summary
}

/**
 * Get error statistics (counts by category and severity).
 */
export function getErrorStats() {
  const byCategory = {}
  const bySeverity = {}
  for (const entry of _errorLog) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1
  }
  return { total: _errorLog.length, byCategory, bySeverity }
}

export function clearErrorLog() {
  _errorLog.length = 0
}
