import { formatNumber } from './format'

export function sortByNewest(arr) {
  return arr.slice().sort((a, b) => {
    const am = a._mod || new Date(a.date || '1970-01-01').getTime()
    const bm = b._mod || new Date(b.date || '1970-01-01').getTime()
    return bm - am
  })
}

export function sum(arr, key) {
  return arr.reduce((s, item) => s + (Number(item[key]) || 0), 0)
}

export function isProsDebtPay(r, debts) {
  if (!r.isDebtPayment || !r.debtId) return false
  const d = debts.find(x => x.id === r.debtId)
  return d?.type === 'prosthetic'
}

function pdDocAmt(r) { return Number(r._docAmount !== undefined ? r._docAmount : r.amount || 0) || 0 }

export function prosDocEarnings(cp, pdPays) {
  const nonDebt = cp.filter(p => !p.isDebt)
  const pCash = sum(nonDebt.filter(p => p.payment === 'كاش'), 'doctorShare') +
    pdPays.filter(r => r.payment === 'كاش').reduce((s, r) => s + pdDocAmt(r), 0)
  const pXfer = sum(nonDebt.filter(p => p.payment !== 'كاش'), 'doctorShare') +
    pdPays.filter(r => r.payment !== 'كاش').reduce((s, r) => s + pdDocAmt(r), 0)
  return { pCash, pXfer, pDoc: pCash + pXfer }
}

export function recDateFilter(r, filterType, month) {
  if (!r.date) return false
  if (filterType === 'all') return true
  const today = new Date().toISOString().substring(0, 10)
  if (filterType === 'today') return r.date === today
  if (filterType === 'week') {
    const d = new Date()
    const day = d.getDay() || 7
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day - 1))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return r.date >= mon.toISOString().substring(0, 10) && r.date <= sun.toISOString().substring(0, 10)
  }
  return r.date?.startsWith(month)
}

export function n(v) {
  return formatNumber(v)
}
