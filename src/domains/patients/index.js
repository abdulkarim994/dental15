/**
 * Patients Domain — Phase 6
 *
 * Aggregates all patient-related services, repositories, and DTOs.
 * Components should import from this domain index for clean separation.
 *
 * Dependencies:
 *   - Repository: patients.repository (local cache)
 *   - DTO: patient.dto (data mapping)
 *   - Store: patients.store (state management)
 *   - Utils: search.js (fuzzy matching for patient lookup)
 */

export { patientsRepository } from '@/repositories/patients.repository'
export { toPatientDTO, toPatientDTOList } from '@/dto/patient.dto'
export { usePatientsStore } from '@/stores/patients.store'
export { fuzzyMatch, fuzzyScore } from '@/utils/search'
