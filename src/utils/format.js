export function formatNumber(v) {
  if (v == null || isNaN(Number(v))) return '0'
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function getMonthFromDate(dateStr) {
  return (dateStr || '').substring(0, 7)
}

export function getCurrentMonth() {
  return new Date().toISOString().substring(0, 7)
}

export function getCurrentDate() {
  return new Date().toISOString().substring(0, 10)
}

export function isProsthetic(service) {
  return /(تركيب|بروتيز|جسر|طقم|crown|prosth)/i.test(service) || service === 'تركيبات'
}
