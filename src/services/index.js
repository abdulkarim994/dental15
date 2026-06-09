/**
 * Services Index — Phase 6
 *
 * Central re-export for services that are commonly used across modules.
 * Module-level services (e.g. prosthetics.service, xrays.service) should
 * be imported from their domain index instead.
 */

// Error handling & diagnostics
export { logError, ErrorCategory, ErrorSeverity, getErrorLog, getErrorStats, createErrorHandler } from './error.service'
export { getDiagnosticReport, getHealthCheck, exportDiagnostics } from './diagnostics.service'

// Memory & cleanup
export { takeMemorySnapshot, getMemoryReport, isMemoryPressureHigh } from './memory-diagnostics.service'
export { runCleanupCycle, runPressureCleanup } from './auto-cleanup.service'

// Auth & security
export { Permission, hasPermission, requirePermission, isAuthenticated } from './permissions.service'
export { validateRecordPayload, validateDebtPayload, validateAppointmentPayload, validateConfigPayload, validateBatchSize } from './api-validation.service'
