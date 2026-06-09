/**
 * Appointments Domain — Phase 6
 *
 * Aggregates all appointment-related services, repositories, and DTOs.
 *
 * Dependencies:
 *   - Repository: appointments.repository (local cache)
 *   - DTO: appointment.dto (data mapping)
 *   - Store: appointments.store (state management)
 */

export { appointmentsRepository } from '@/repositories/appointments.repository'
export { toAppointmentDTO, toAppointmentDB, toAppointmentDTOList } from '@/dto/appointment.dto'
export { useAppointmentsStore } from '@/stores/appointments.store'
