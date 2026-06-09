/**
 * Record DTO — Phase 6
 *
 * Maps between raw Supabase/SQLite record data and the UI model.
 * Prevents raw DB schema from leaking into components.
 */

export function toRecordDTO(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name || '',
    date: raw.date || '',
    clinic: raw.clinic || '',
    service: raw.service || '',
    amount: Number(raw.amount) || 0,
    payment: raw.payment || '',
    phone: raw.phone || '',
    notes: raw.notes || '',
    doctorShare: Number(raw.doctorShare) || 0,
    isDebt: !!raw.isDebt,
    isDebtPayment: !!raw.isDebtPayment,
    debtId: raw.debtId || null,
    isPros: !!raw.isPros,
    _mod: raw._mod || 0,
  }
}

export function toRecordDB(dto) {
  return {
    id: dto.id,
    name: dto.name,
    date: dto.date,
    clinic: dto.clinic,
    service: dto.service,
    amount: dto.amount,
    payment: dto.payment,
    phone: dto.phone || '',
    notes: dto.notes || '',
    doctorShare: dto.doctorShare || 0,
    isDebt: dto.isDebt || false,
    isDebtPayment: dto.isDebtPayment || false,
    debtId: dto.debtId || null,
    isPros: dto.isPros || false,
    _mod: Date.now(),
  }
}

export function toRecordDTOList(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map(toRecordDTO).filter(Boolean)
}
