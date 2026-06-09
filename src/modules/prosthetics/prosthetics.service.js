/**
 * Prosthetics Service
 * Handles prosthetic record CRUD and calculations
 */

export function calculateProstheticShares(prosthetic, doctorPct = 50) {
  const total = Number(prosthetic.total) || 0
  const labValue = Number(prosthetic.labValue) || 0
  const profit = total - labValue
  const doctorShare = Math.round(profit * (doctorPct / 100))
  const clinicShare = profit - doctorShare
  return { profit, doctorShare, clinicShare }
}

export function getProstheticsByPatient(prosthetics, patientName) {
  return prosthetics.filter(p => p.name === patientName)
}

export function getProstheticsByMonth(prosthetics, month) {
  return prosthetics.filter(p => p.date?.startsWith(month))
}

export function getProstheticsByClinic(prosthetics, clinic) {
  return prosthetics.filter(p => p.clinic === clinic)
}

export function getProstheticStats(prosthetics, doctorPct = 50) {
  let totalRevenue = 0
  let totalLabCost = 0
  let totalDoctorShare = 0
  let totalClinicShare = 0

  for (const p of prosthetics) {
    const total = Number(p.total) || 0
    const lab = Number(p.labValue) || 0
    totalRevenue += total
    totalLabCost += lab
    const shares = calculateProstheticShares(p, doctorPct)
    totalDoctorShare += shares.doctorShare
    totalClinicShare += shares.clinicShare
  }

  return {
    count: prosthetics.length,
    totalRevenue,
    totalLabCost,
    totalProfit: totalRevenue - totalLabCost,
    totalDoctorShare,
    totalClinicShare,
  }
}

export function createProstheticRecord(data) {
  return {
    id: data.id || crypto.randomUUID(),
    name: data.name || '',
    date: data.date || new Date().toISOString().substring(0, 10),
    clinic: data.clinic || '',
    type: data.type || '',
    total: Number(data.total) || 0,
    labValue: Number(data.labValue) || 0,
    doctorShare: Number(data.doctorShare) || 0,
    clinicShare: Number(data.clinicShare) || 0,
    notes: data.notes || '',
    isPros: true,
    _mod: Date.now(),
  }
}
