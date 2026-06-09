/**
 * Appointment DTO — Phase 6
 *
 * Maps between raw appointment data and the UI model.
 */

export function toAppointmentDTO(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    date: raw.date || '',
    time: raw.time || '',
    service: raw.service || '',
    status: raw.status || 'scheduled',
    notes: raw.notes || '',
    _mod: raw._mod || 0,
  }
}

export function toAppointmentDB(dto) {
  return {
    id: dto.id,
    name: dto.name,
    phone: dto.phone || '',
    date: dto.date,
    time: dto.time || '',
    service: dto.service || '',
    status: dto.status || 'scheduled',
    notes: dto.notes || '',
    _mod: Date.now(),
  }
}

export function toAppointmentDTOList(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map(toAppointmentDTO).filter(Boolean)
}
