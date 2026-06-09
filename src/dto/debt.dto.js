/**
 * Debt DTO — Phase 6
 *
 * Maps between raw debt data and the UI model.
 */

export function toDebtDTO(raw) {
  if (!raw) return null
  const totalAmount = Number(raw.totalAmount || raw.total) || 0
  const paidAmount = Number(raw.paidAmount) || 0
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    service: raw.service || '',
    totalAmount,
    total: totalAmount,
    paidAmount,
    remaining: Math.max(0, totalAmount - paidAmount),
    status: raw.status || 'unpaid',
    type: raw.type || 'normal',
    notes: raw.notes || '',
    date: raw.date || '',
    _mod: raw._mod || 0,
  }
}

export function toDebtDB(dto) {
  return {
    id: dto.id,
    name: dto.name,
    phone: dto.phone || '',
    service: dto.service || '',
    totalAmount: dto.totalAmount,
    total: dto.totalAmount,
    paidAmount: dto.paidAmount || 0,
    remaining: dto.remaining || 0,
    status: dto.status || 'unpaid',
    type: dto.type || 'normal',
    notes: dto.notes || '',
    date: dto.date || '',
    _mod: Date.now(),
  }
}

export function toDebtDTOList(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList.map(toDebtDTO).filter(Boolean)
}
