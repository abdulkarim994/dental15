/**
 * Reports Service
 * Generates financial and clinical reports from store data
 */

import { sum, isProsDebtPay, prosDocEarnings } from '@/utils/helpers'

export function getMonthlyReport(records, prosthetics, debts, month, doctorPct = 50) {
  const monthRecs = records.filter(r => r.date?.startsWith(month) && !r.isDebt && !r.isPros && !r.isDebtPayment && r.payment !== 'دين' && !isProsDebtPay(r, debts))
  const monthDebtPays = records.filter(r => r.date?.startsWith(month) && r.isDebtPayment && !isProsDebtPay(r, debts))
  const monthPros = prosthetics.filter(p => p.date?.startsWith(month))
  const monthPdPays = records.filter(r => r.date?.startsWith(month) && isProsDebtPay(r, debts))

  const allRecs = [...monthRecs, ...monthDebtPays]
  const cashRecs = allRecs.filter(r => r.payment === 'كاش' || r.payment === 'نقد' || r.payment === 'نقدي')
  const xferRecs = allRecs.filter(r => r.payment !== 'كاش' && r.payment !== 'نقد' && r.payment !== 'نقدي')

  const totalCash = sum(cashRecs, 'amount')
  const totalXfer = sum(xferRecs, 'amount')
  const totalRecords = totalCash + totalXfer

  const { pDoc: totalDocPros } = prosDocEarnings(monthPros, monthPdPays)

  let totalProsRevenue = 0
  let totalLabCost = 0
  let totalClinicPros = 0

  for (const p of monthPros) {
    const t = Number(p.total) || 0
    const lab = Number(p.labValue) || 0
    totalProsRevenue += t
    totalLabCost += lab
    totalClinicPros += Number(p.clinicShare) || 0
  }

  const docRecords = Math.round(totalRecords * (doctorPct / 100))
  const clinicRecords = totalRecords - docRecords

  return {
    month,
    records: {
      count: monthRecs.length,
      cash: totalCash,
      xfer: totalXfer,
      total: totalRecords,
      doctorShare: docRecords,
      clinicShare: clinicRecords,
    },
    prosthetics: {
      count: monthPros.length,
      revenue: totalProsRevenue,
      labCost: totalLabCost,
      profit: totalProsRevenue - totalLabCost,
      doctorShare: totalDocPros,
      clinicShare: totalClinicPros,
    },
    totals: {
      doctorTotal: docRecords + totalDocPros,
      clinicTotal: clinicRecords + totalClinicPros,
      grandTotal: totalRecords + totalProsRevenue,
    },
  }
}

export function getClinicReport(records, clinic, month) {
  return records.filter(r => r.clinic === clinic && r.date?.startsWith(month))
}

export function getPatientReport(records, prosthetics, patientName) {
  const patRecs = records.filter(r => r.name === patientName)
  const patPros = prosthetics.filter(p => p.name === patientName)
  const totalSpent = sum(patRecs, 'amount') + sum(patPros, 'total')
  const visitCount = patRecs.length + patPros.length
  const lastVisit = [...patRecs, ...patPros].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date || null

  return {
    name: patientName,
    records: patRecs,
    prosthetics: patPros,
    totalSpent,
    visitCount,
    lastVisit,
  }
}

export function getServiceBreakdown(records, month) {
  const monthRecs = records.filter(r => r.date?.startsWith(month) && !r.isDebt && !r.isPros)
  const breakdown = {}
  for (const r of monthRecs) {
    const svc = r.service || 'أخرى'
    if (!breakdown[svc]) breakdown[svc] = { count: 0, total: 0 }
    breakdown[svc].count++
    breakdown[svc].total += Number(r.amount) || 0
  }
  return breakdown
}
