<template>
  <div class="space-y-4">
    <!-- Year Selector -->
    <div class="flex items-center justify-between mb-2">
      <h2 class="sec-h">أرباح الطبيب</h2>
      <select v-model="selectedYear" class="inp text-xs" style="width:auto;padding:6px 12px;border-radius:12px">
        <option v-for="y in years" :key="y">{{ y }}</option>
      </select>
    </div>

    <!-- 6-Month Chart -->
    <div class="glass p-4 rounded-2xl">
      <p class="text-[9px] opacity-35 text-center mb-2">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        مقارنة آخر 6 أشهر
      </p>
      <div class="mth-chart">
        <div v-for="(bar, i) in chartBars" :key="i" style="flex:1;display:flex;flex-direction:column;align-items:center;cursor:pointer" @click="goArchiveMonth(bar.month)" :title="bar.tip">
          <div :style="{ width: '100%', height: bar.pct + '%', background: bar.isCurrent ? 'linear-gradient(to top,rgba(234,179,8,.85),rgba(234,179,8,.4))' : 'linear-gradient(to top,rgba(59,130,246,.5),rgba(59,130,246,.2))', borderRadius: '5px 5px 0 0', minHeight: '4px', transition: 'height .5s cubic-bezier(.34,1.56,.64,1)' }"></div>
          <div class="mth-lbl">{{ bar.label }}</div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="glass p-5 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-card p-4 text-center">
          <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg> إجمالي الكاش</p>
          <p class="text-lg font-black text-green-400"><span class="n">{{ n(yearCash) }}</span></p>
          <p class="text-[9px] opacity-35">{{ cur }}</p>
        </div>
        <div class="stat-card p-4 text-center">
          <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/><path d="M8 15h4"/></svg> إجمالي التحويل</p>
          <p class="text-lg font-black text-blue-400"><span class="n">{{ n(yearXfer) }}</span></p>
          <p class="text-[9px] opacity-35">{{ cur }}</p>
        </div>
      </div>
      <div class="stat-card p-4 space-y-2">
        <div class="text-center">
          <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><path d="M12 2C8.5 2 7 4.5 7 7c0 3 1.5 6 2 9 .3 2 .7 4 1 5h4c.3-1 .7-3 1-5 .5-3 2-6 2-9 0-2.5-1.5-5-5-5z"/></svg> نسبة الطبيب — تركيبات ({{ cur }})</p>
          <p class="text-lg font-black text-yellow-400"><span class="n">{{ n(yearProsDoc) }}</span> {{ cur }}</p>
        </div>
        <div v-if="yearProsDoc > 0" class="border-t border-white/10 pt-2 grid grid-cols-2 gap-2 text-center">
          <div><p class="text-[9px] opacity-40"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg> كاش</p><p class="text-sm font-bold text-green-300"><span class="n">{{ n(yearProsCash) }}</span></p></div>
          <div><p class="text-[9px] opacity-40"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/><path d="M8 15h4"/></svg> تحويل</p><p class="text-sm font-bold text-blue-300"><span class="n">{{ n(yearProsXfer) }}</span></p></div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-4 text-center">
        <p class="text-xs opacity-35 mb-2">إجمالي سنة <span class="n">{{ selectedYear }}</span></p>
        <p class="text-3xl font-black" style="color:var(--gold)"><span class="n">{{ n(yearGrand) }}</span></p>
        <p class="opacity-40 text-sm mt-1">{{ cur }}</p>
      </div>
      <button @click="printAnnual" class="btn-o w-full py-3 text-sm mt-3 flex items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        طباعة الجرد السنوي
      </button>
    </div>

    <!-- Monthly Breakdown -->
    <div class="space-y-2">
      <span class="sec-h">التفاصيل الشهرية</span>
      <template v-for="(row, i) in monthRows" :key="i">
        <div v-if="row.total > 0" class="glass-sm p-3 flex justify-between items-center row-card clickable" style="border-radius:12px" @click="goArchiveMonth(row.month)">
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-60">{{ row.name }}</span>
            <span class="text-[9px] opacity-30">← للتفاصيل</span>
          </div>
          <span class="text-xs font-bold" style="color:var(--gold)"><span class="n">{{ n(row.total) }}</span> {{ cur }}</span>
        </div>
      </template>
      <p v-if="!monthRows.some(r => r.total > 0)" class="text-xs opacity-30 text-center py-4">لا توجد بيانات لهذه السنة</p>
    </div>

    <PrintOverlay
      :visible="printVisible"
      :title="printTitle"
      :html="printHtml"
      @close="printVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { sum, isProsDebtPay, prosDocEarnings, n } from '@/utils/helpers'

const PrintOverlay = defineAsyncComponent(() => import('@/components/PrintOverlay.vue'))

const router = useRouter()
const app = useAppStore()
const cur = computed(() => app.currency)

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

const years = computed(() => {
  const ys = new Set([
    ...app.records.map(r => r.date?.substring(0, 4)),
    ...app.prosthetics.map(p => p.date?.substring(0, 4)),
    String(new Date().getFullYear()),
  ])
  return [...ys].filter(Boolean).sort().reverse()
})

const selectedYear = ref(String(new Date().getFullYear()))

const yrRecs = computed(() => app.records.filter(r => r.date?.startsWith(selectedYear.value) && !r.isDebt && !r.isPros && !r.isDebtPayment && r.payment !== 'دين' && !isProsDebtPay(r, app.debts)))
const yrPros = computed(() => app.prosthetics.filter(p => p.date?.startsWith(selectedYear.value)))
const yrPdPays = computed(() => app.records.filter(r => r.date?.startsWith(selectedYear.value) && isProsDebtPay(r, app.debts)))
const yrRegDebtPays = computed(() => app.records.filter(r => r.date?.startsWith(selectedYear.value) && r.isDebtPayment && !isProsDebtPay(r, app.debts)))

const yearCash = computed(() => sum(yrRecs.value.filter(r => r.payment === 'كاش'), 'amount') + sum(yrRegDebtPays.value.filter(r => r.payment === 'كاش'), 'amount'))
const yearXfer = computed(() => sum(yrRecs.value.filter(r => r.payment !== 'كاش'), 'amount') + sum(yrRegDebtPays.value.filter(r => r.payment !== 'كاش'), 'amount'))
const prosEarnings = computed(() => prosDocEarnings(yrPros.value, yrPdPays.value))
const yearProsDoc = computed(() => prosEarnings.value.pDoc)
const yearProsCash = computed(() => prosEarnings.value.pCash)
const yearProsXfer = computed(() => prosEarnings.value.pXfer)
const yearGrand = computed(() => yearCash.value + yearXfer.value + yearProsDoc.value)

const monthTotalsMap = computed(() => {
  const map = {}
  // Pre-index records by month to avoid 12x full-array scans
  const recsByMonth = {}
  const prosByMonth = {}
  for (const r of yrRecs.value) {
    const m = r.date?.substring(0, 7)
    if (m) (recsByMonth[m] ||= []).push(r)
  }
  for (const r of yrRegDebtPays.value) {
    const m = r.date?.substring(0, 7)
    if (m) (recsByMonth[m] ||= []).push(r)
  }
  for (const p of yrPros.value) {
    const m = p.date?.substring(0, 7)
    if (m) (prosByMonth[m] ||= []).push(p)
  }
  const pdPaysByMonth = {}
  for (const r of yrPdPays.value) {
    const m = r.date?.substring(0, 7)
    if (m) (pdPaysByMonth[m] ||= []).push(r)
  }
  for (let i = 0; i < 12; i++) {
    const m = `${selectedYear.value}-${String(i + 1).padStart(2, '0')}`
    const mr = recsByMonth[m] || []
    const mp = prosByMonth[m] || []
    const mpp = pdPaysByMonth[m] || []
    map[m] = sum(mr, 'amount') + prosDocEarnings(mp, mpp).pDoc
  }
  return map
})

function getMonthTotal(m) {
  return monthTotalsMap.value[m] || 0
}

const monthRows = computed(() => {
  return AR_MONTHS.map((mn, i) => {
    const m = `${selectedYear.value}-${String(i + 1).padStart(2, '0')}`
    return { name: mn, month: m, total: monthTotalsMap.value[m] || 0 }
  })
})

const chartBars = computed(() => {
  const today = new Date()
  const curMo = today.toISOString().substring(0, 7)
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const lbl = AR_MONTHS[d.getMonth()].substring(0, 3)
    months.push({ month: m, label: lbl })
  }
  const vals = months.map(x => getMonthTotal(x.month))
  const maxV = Math.max(...vals, 1)
  return months.map((x, i) => ({
    ...x,
    pct: vals[i] ? Math.max(8, Math.round(vals[i] / maxV * 100)) : 4,
    isCurrent: x.month === curMo,
    tip: vals[i] ? (n(vals[i]) + ' ' + cur.value) : 'لا بيانات',
  }))
})

function goArchiveMonth(m) {
  app.selectedMonth = m
  app.activeTab = 'archive'
  router.push({ name: 'archive' })
}

/* ── PRINT ANNUAL REPORT ── */
const printVisible = ref(false)
const printTitle = ref('')
const printHtml = ref('')

function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function printAnnual() {
  const yr = selectedYear.value
  const clinicName = _esc(app.centerName || 'عيادة الأسنان')
  const dp = app.config.doctorPct || 50
  const dpR = app.config.doctorPctRegular || dp

  const mRows = AR_MONTHS.map((mn, i) => {
    const m = `${yr}-${String(i + 1).padStart(2, '0')}`
    const mr = app.records.filter(r => r.date?.startsWith(m) && !r.isDebt && !r.isPros && !r.isDebtPayment && r.payment !== 'دين' && !isProsDebtPay(r, app.debts))
    const mrdp = app.records.filter(r => r.date?.startsWith(m) && r.isDebtPayment && !isProsDebtPay(r, app.debts))
    const mp = app.prosthetics.filter(p => p.date?.startsWith(m))
    const mPdPays = app.records.filter(r => r.date?.startsWith(m) && isProsDebtPay(r, app.debts))
    const mc = sum(mr.filter(r => r.payment === 'كاش'), 'amount') + sum(mrdp.filter(r => r.payment === 'كاش'), 'amount')
    const mx = sum(mr.filter(r => r.payment !== 'كاش'), 'amount') + sum(mrdp.filter(r => r.payment !== 'كاش'), 'amount')
    const { pDoc: md } = prosDocEarnings(mp, mPdPays)
    const mt = mc + mx + md
    const recTotal = mc + mx
    const recDoc = Math.round(recTotal * dpR / 100 * 100) / 100
    const prosClinic = mp.filter(p => !p.isDebt).reduce((s, p) => s + (Number(p.clinicShare) || 0), 0) + mPdPays.reduce((s, r) => { const doc = Number(r._docAmount !== undefined ? r._docAmount : r.amount || 0) || 0; return s + (dp > 0 ? doc * ((100 - dp) / dp) : 0) }, 0)
    const docTotal = recDoc + md
    const clinTotal = Math.round(recTotal * (100 - dpR) / 100 * 100) / 100 + prosClinic
    const recClin = Math.round(recTotal * (100 - dpR) / 100 * 100) / 100
    return { name: mn, cash: mc, xfer: mx, pros: md, total: mt, recDoc, docTotal, clinTotal, recClin, prosClinic }
  }).filter(r => r.total > 0)

  const grandCash = yearCash.value
  const grandXfer = yearXfer.value
  const grandPros = yearProsDoc.value
  const grandTotal = yearGrand.value
  const grandDocTotal = mRows.reduce((s, r) => s + r.docTotal, 0)
  const grandClinTotal = mRows.reduce((s, r) => s + r.clinTotal, 0)
  const grandRecDoc = mRows.reduce((s, r) => s + r.recDoc, 0)
  const grandRecClin = mRows.reduce((s, r) => s + r.recClin, 0)
  const grandProsClin = mRows.reduce((s, r) => s + r.prosClinic, 0)

  const td = 'padding:7px 10px;border-bottom:1px solid #eee;text-align:right'
  const monthRowsHtml = mRows.map(r => `
    <tr>
      <td style="${td};font-weight:600">${r.name}</td>
      <td style="${td}">${n(r.cash)} ${cur.value}</td>
      <td style="${td}">${n(r.xfer)} ${cur.value}</td>
      <td style="${td}">${n(r.pros)} ${cur.value}</td>
      <td style="${td};font-weight:800">${n(r.total)} ${cur.value}</td>
      <td style="${td}">${n(r.recDoc)} ${cur.value}</td>
      <td style="${td}">${n(r.pros)} ${cur.value}</td>
      <td style="${td};font-weight:700">${n(r.docTotal)} ${cur.value}</td>
      <td style="${td}">${n(r.clinTotal)} ${cur.value}</td>
    </tr>
  `).join('')

  const th = 'padding:8px 10px;text-align:right'
  printTitle.value = 'الجرد السنوي ' + yr
  printHtml.value = `
    <h1>${clinicName}</h1>
    <p class="sub">الجرد السنوي — ${yr} — تركيبات ${dp}% / معالجات ${dpR}%</p>
    <table>
      <thead><tr>
        <th style="${th}">كاش</th>
        <th style="${th}">تحويل</th>
        <th style="${th}">تركيبات</th>
        <th style="${th}">الإجمالي</th>
        <th style="${th}">طبيب معالجات (${dpR}%)</th>
        <th style="${th}">طبيب تركيبات (${dp}%)</th>
        <th style="${th}">إجمالي الطبيب</th>
        <th style="${th}">إجمالي العيادة</th>
      </tr></thead>
      <tbody><tr>
        <td style="${td};font-weight:700">${n(grandCash)} ${cur.value}</td>
        <td style="${td};font-weight:700">${n(grandXfer)} ${cur.value}</td>
        <td style="${td};font-weight:700">${n(grandPros)} ${cur.value}</td>
        <td style="${td};font-weight:800;color:#1d4ed8">${n(grandTotal)} ${cur.value}</td>
        <td style="${td};font-weight:700">${n(grandRecDoc)} ${cur.value}</td>
        <td style="${td};font-weight:700">${n(grandPros)} ${cur.value}</td>
        <td style="${td};font-weight:800">${n(grandDocTotal)} ${cur.value}</td>
        <td style="${td};font-weight:700">${n(grandClinTotal)} ${cur.value}</td>
      </tr></tbody>
    </table>
    <h3 style="margin:16px 0 6px;color:#0a1428">التفاصيل الشهرية</h3>
    <table>
      <thead><tr>
        <th style="${th}">الشهر</th>
        <th style="${th}">كاش</th>
        <th style="${th}">تحويل</th>
        <th style="${th}">تركيبات</th>
        <th style="${th}">الإجمالي</th>
        <th style="${th}">طبيب معالجات (${dpR}%)</th>
        <th style="${th}">طبيب تركيبات (${dp}%)</th>
        <th style="${th}">إجمالي الطبيب</th>
        <th style="${th}">إجمالي العيادة</th>
      </tr></thead>
      <tbody>
        ${monthRowsHtml}
        <tr class="total-row">
          <td style="${td};font-weight:800">الإجمالي السنوي</td>
          <td style="${td};font-weight:800">${n(grandCash)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandXfer)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandPros)} ${cur.value}</td>
          <td style="${td};font-weight:900;color:#1d4ed8">${n(grandTotal)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandRecDoc)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandPros)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandDocTotal)} ${cur.value}</td>
          <td style="${td};font-weight:800">${n(grandClinTotal)} ${cur.value}</td>
        </tr>
      </tbody>
    </table>`
  const pendingDebts = (app.debts || []).filter(d => d.status !== 'paid')
  if (pendingDebts.length) {
    const totalPending = pendingDebts.reduce((s, d) => s + (Number(d.remaining) || 0), 0)
    printHtml.value += `<div style="margin-top:16px;padding:10px 14px;background:#FFF8E1;border:1px solid #FFE082;border-radius:6px">
      <strong style="color:#F57F17">ديون معلقة:</strong>
      <span style="font-size:12px"> ${pendingDebts.length} دين بإجمالي متبقي <strong>${n(totalPending)} ${cur.value}</strong></span>
    </div>`
  }
  printVisible.value = true
}
</script>
