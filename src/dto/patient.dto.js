/**
 * Patient DTO — Phase 6
 *
 * Maps between raw patient data (aggregated from records) and the UI model.
 */

export function toPatientDTO(raw) {
  if (!raw) return null
  return {
    id: raw.id || raw.name,
    name: raw.name || '',
    phone: raw.phone || '',
    totalSpent: Number(raw.totalSpent) || 0,
    visitCount: Number(raw.visitCount) || 0,
    lastVisit: raw.lastVisit || null,
    services: Array.isArray(raw.services) ? raw.services : [],
    clinics: Array.isArray(raw.clinics) ? raw.clinics : [],
    hasProsthetics: !!raw.hasProsthetics,
    hasDebt: !!raw.hasDebt,
    _mod: raw._mod || 0,
  }
}

export function toPatientDTOList(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map(toPatientDTO).filter(Boolean)
}
