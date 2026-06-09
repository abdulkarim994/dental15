/**
 * DTO Index — Phase 6
 *
 * Central export for all Data Transfer Object mappings.
 * Use these to convert between raw DB data and UI-safe models.
 */

export { toRecordDTO, toRecordDB, toRecordDTOList } from './record.dto'
export { toPatientDTO, toPatientDTOList } from './patient.dto'
export { toDebtDTO, toDebtDB, toDebtDTOList } from './debt.dto'
export { toAppointmentDTO, toAppointmentDB, toAppointmentDTOList } from './appointment.dto'
