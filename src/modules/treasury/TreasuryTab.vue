<template>
  <div>
    <!-- Main View -->
    <div v-if="!detailView" class="space-y-5">
      <div v-for="cli in clinics" :key="cli" class="space-y-2">
        <span class="sec-h">{{ cli }}</span>
        <div class="grid grid-cols-3 gap-2">
          <div class="stat-card p-3 text-center cursor-pointer" @click="showDetail('cash', cli)">
            <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg> كاش</p>
            <p class="text-sm font-bold text-green-400"><span class="n">{{ n(getClinicCash(cli)) }}</span></p>
            <p class="text-[9px] opacity-30">{{ cur }}</p>
          </div>
          <div class="stat-card p-3 text-center cursor-pointer" @click="showDetail('xfer', cli)">
            <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/><path d="M8 15h4"/></svg> تحويل</p>
            <p class="text-sm font-bold text-blue-400"><span class="n">{{ n(getClinicXfer(cli)) }}</span></p>
            <p class="text-[9px] opacity-30">{{ cur }}</p>
          </div>
          <div class="stat-card p-3 text-center cursor-pointer" @click="showDetail('pros', cli)">
            <p class="text-[9px] opacity-45 mb-1"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><path d="M12 2C8.5 2 7 4.5 7 7c0 3 1.5 6 2 9 .3 2 .7 4 1 5h4c.3-1 .7-3 1-5 .5-3 2-6 2-9 0-2.5-1.5-5-5-5z"/></svg> تركيبات</p>
            <p class="text-sm font-bold text-yellow-400"><span class="n">{{ n(getClinicProsDoc(cli)) }}</span></p>
            <p class="text-[9px] opacity-30">{{ cur }}</p>
          </div>
        </div>
        <!-- Pending Debts for clinic -->
        <div v-if="getClinicDebtRem(cli) > 0" class="stat-card p-3 flex justify-between items-center cursor-pointer" style="border-color:rgba(255,68,85,.2);background:rgba(255,68,85,.05)" @click="goDebts(cli)">
          <div class="flex items-center gap-2">
            <span style="color:var(--red)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></span>
            <div>
              <p class="text-[9px] opacity-60 font-bold" style="color:var(--red)">ديون معلقة ({{ getClinicDebts(cli).length }})</p>
              <p class="text-[8px] opacity-40">لم تُضف للإيرادات بعد</p>
            </div>
          </div>
          <span class="text-sm font-black text-red-400"><span class="n">{{ n(getClinicDebtRem(cli)) }}</span> <span class="text-[9px] opacity-50">{{ cur }}</span></span>
        </div>
      </div>

      <!-- Grand Total -->
      <div class="glass p-4 mt-2">
        <div class="flex justify-between items-center mb-3">
          <p class="text-xs opacity-50 font-bold">إجمالي <span class="n">{{ month }}</span></p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div><p class="text-[9px] opacity-40">كاش (مدفوع)</p><p class="text-sm font-bold text-green-400"><span class="n">{{ n(totalCash) }}</span></p></div>
          <div><p class="text-[9px] opacity-40">تحويل (مدفوع)</p><p class="text-sm font-bold text-blue-400"><span class="n">{{ n(totalXfer) }}</span></p></div>
          <div><p class="text-[9px] opacity-40">تركيبات ({{ cur }})</p><p class="text-sm font-bold text-yellow-400"><span class="n">{{ n(totalProsDoc) }}</span></p></div>
        </div>
        <div class="border-t border-white/10 pt-3 text-center">
          <p class="text-[9px] opacity-35 mb-1">الدخل الفعلي (المحصّل)</p>
          <p class="text-2xl font-black" style="color:var(--gold)"><span class="n">{{ n(grandTotal) }}</span> {{ cur }}</p>
        </div>
        <div v-if="totalDebtRem > 0" class="border-t border-red-500/20 pt-3 mt-3 text-center cursor-pointer" @click="goDebts">
          <p class="text-[9px] opacity-45 mb-1 text-red-400 font-bold">⚠ رصيد الديون المعلقة (غير محصّل)</p>
          <p class="text-lg font-black text-red-400"><span class="n">{{ n(totalDebtRem) }}</span> {{ cur }}</p>
          <p class="text-[8px] opacity-30 mt-1">لا تُضاف للإيرادات حتى يتم التحصيل — اضغط لعرض الديون</p>
        </div>
      </div>
    </div>

    <!-- Detail View -->
    <div v-else>
      <div class="flex items-center gap-2 mb-3">
        <button @click="detailView = null" class="btn-o px-3 py-1.5 text-xs">← رجوع</button>
        <h3 class="font-bold text-sm flex-1" style="color:var(--gold)">{{ detailTitle }}</h3>
        <button @click="printDetail" class="btn-o px-2.5 py-1.5 text-xs">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> طباعة
        </button>
      </div>

      <!-- Category Tabs -->
      <div class="rec-filter-bar mb-2">
        <button class="rec-filter-btn" :class="{ 'rf-on': detailView === 'cash' }" @click="switchCategory('cash')">كاش</button>
        <button class="rec-filter-btn" :class="{ 'rf-on': detailView === 'xfer' }" @click="switchCategory('xfer')">تحويل</button>
        <button class="rec-filter-btn" :class="{ 'rf-on': detailView === 'pros' }" @click="switchCategory('pros')">تركيبات</button>
      </div>

      <!-- Filters -->
      <div class="flex gap-2 mb-2">
        <div class="relative flex-1">
          <input type="text" v-model="filterName" class="inp text-xs" style="padding:8px 36px 8px 10px;height:36px" placeholder="بحث بالاسم..." autocomplete="off">
          <svg class="absolute top-1/2 right-2.5 -translate-y-1/2 opacity-30" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
        <button class="btn-o px-2.5" style="border-radius:10px;height:36px" @click="showDateRange = !showDateRange" :class="{ 'rf-on': showDateRange || filterFrom || filterTo }">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </button>
        <button class="btn-o px-2.5" style="border-radius:10px;height:36px" @click="toggleSort" :title="sortLabel">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10M11 9h7M11 13h4M3 17l4 4 4-4M7 3v18"/></svg>
        </button>
      </div>
      <!-- Date Range (collapsible) -->
      <div v-if="showDateRange" class="flex gap-2 mb-2">
        <div class="flex-1">
          <label class="text-[8px] opacity-40 block mb-0.5">من</label>
          <input type="date" v-model="filterFrom" class="inp text-xs n" style="height:32px;padding:4px 8px">
        </div>
        <div class="flex-1">
          <label class="text-[8px] opacity-40 block mb-0.5">إلى</label>
          <input type="date" v-model="filterTo" class="inp text-xs n" style="height:32px;padding:4px 8px">
        </div>
        <button v-if="filterFrom || filterTo" class="btn-o self-end" style="height:32px;padding:4px 10px;font-size:10px" @click="filterFrom='';filterTo=''">مسح</button>
      </div>
      <!-- Sort indicator -->
      <p v-if="sortMode !== 'date-desc'" class="text-[9px] opacity-40 mb-2">ترتيب: {{ sortLabel }}</p>

      <!-- Prosthetics grouped by patient -->
      <template v-if="detailView === 'pros'">
        <div v-for="g in filteredProsGrouped" :key="g.name" class="glass p-3 mb-3">
          <div class="flex justify-between items-center mb-2">
            <p class="text-xs font-bold" style="color:var(--gold)">{{ g.name }}</p>
            <p class="text-xs font-bold text-yellow-400"><span class="n">{{ n(g.docTotal) }}</span> {{ cur }}</p>
          </div>
          <div v-for="r in g.items" :key="r.id" class="row-card p-2 mb-1">
            <div class="flex justify-between items-center">
              <div class="flex-1 min-w-0">
                <p class="text-[10px] opacity-60">
                  {{ r.date || '' }}
                  <span v-if="r.isDebt" style="font-size:8px;margin-right:4px;background:rgba(239,68,68,.15);color:#f87171;padding:1px 5px;border-radius:6px">دين</span>
                  <span v-if="r.isDebtPayment" style="font-size:8px;margin-right:4px;background:rgba(34,197,94,.12);color:#4ade80;padding:1px 5px;border-radius:6px">دفعة</span>
                </p>
              </div>
              <p class="text-[10px] font-bold">
                <span class="n">{{ n(r.isDebtPayment ? (r._fullAmount || r.amount || 0) : (r.total || r.amount || 0)) }}</span> {{ cur }}
              </p>
            </div>
            <div v-if="r.isDebtPayment" class="flex flex-wrap gap-2 mt-1 text-[9px] opacity-50">
              <span>دفعة <span class="n font-bold" style="color:var(--gold-l)">{{ n(r._fullAmount || r.amount || 0) }}</span></span>
              <span v-if="prosPayLab(r) > 0">← معمل: <span class="n text-orange-400">{{ n(prosPayLab(r)) }}</span></span>
              <span v-if="prosPayDoc(r) > 0">| طبيب: <span class="n text-green-400">{{ n(prosPayDoc(r)) }}</span></span>
              <span v-if="prosPayClin(r) > 0">| عيادة: <span class="n text-blue-400">{{ n(prosPayClin(r)) }}</span></span>
            </div>
            <div v-else class="flex gap-3 mt-1 text-[9px] opacity-50">
              <span v-if="r.labValue">معمل: <span class="n">{{ n(r.labValue) }}</span></span>
              <template v-if="r.isDebt">
                <span>حصة طبيب: <span class="n text-yellow-400">{{ n(r.doctorShare || 0) }}</span></span>
              </template>
              <template v-else>
                <span>طبيب: <span class="n text-green-400">{{ n(r.doctorShare || r.amount || 0) }}</span></span>
              </template>
              <span v-if="r.clinicShare && !r.isDebt">عيادة: <span class="n text-blue-400">{{ n(r.clinicShare) }}</span></span>
            </div>
            <div v-if="r.isDebt && r._t === 'p'" class="flex gap-3 mt-1 text-[9px]">
              <span class="opacity-40">المدفوع: <span class="n text-green-400">{{ n(getProsDebtPaid(r.id)) }}</span></span>
              <span class="opacity-40">المتبقي: <span class="n text-red-400">{{ n(getProsDebtRemaining(r.id)) }}</span></span>
            </div>
          </div>
          <div class="border-t border-white/10 pt-2 mt-2 grid grid-cols-4 gap-2 text-center text-[9px]">
            <div><span class="opacity-40">قيمة العمل</span><br><span class="font-bold n">{{ n(g.total) }}</span></div>
            <div><span class="opacity-40">طبيب (محصّل)</span><br><span class="font-bold text-green-400 n">{{ n(g.docTotal) }}</span></div>
            <div><span class="opacity-40">عيادة (محصّل)</span><br><span class="font-bold text-blue-400 n">{{ n(g.clinTotal) }}</span></div>
            <div><span class="opacity-40">معمل</span><br><span class="font-bold text-orange-400 n">{{ n(g.labTotal) }}</span></div>
          </div>
        </div>
        <div v-if="!filteredProsGrouped.length" class="text-center py-8 opacity-30 text-sm">لا توجد بيانات</div>
      </template>

      <!-- Cash/Transfer regular list -->
      <template v-else>
        <div class="space-y-2">
          <div v-for="r in filteredDetailItems" :key="r.id" class="row-card p-3 flex justify-between items-center">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold">{{ r.name || '' }}</p>
              <p class="text-[9px] opacity-35">{{ r.date || '' }} | {{ r.service || r.clinic || '' }}</p>
            </div>
            <p class="text-xs font-bold text-green-400"><span class="n">{{ n(r.amount || r.doctorShare || 0) }}</span> {{ cur }}</p>
          </div>
          <div v-if="!filteredDetailItems.length" class="text-center py-8 opacity-30 text-sm">لا توجد بيانات</div>
        </div>
      </template>

      <div class="glass p-3 mt-3 text-center">
        <p class="text-xs opacity-50 mb-1">الإجمالي{{ (filterName || filterFrom || filterTo) ? ' (مفلتر)' : '' }}</p>
        <p class="text-lg font-black" style="color:var(--gold)"><span class="n">{{ n(filteredDetailTotal) }}</span> {{ cur }}</p>
      </div>
    </div>

    <!-- Print Overlay -->
    <PrintOverlay :visible="showPrint" :title="printTitle" :html="printHtml" @close="showPrint = false" />
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { sum, isProsDebtPay, prosDocEarnings, sortByNewest, n } from '@/utils/helpers'

const PrintOverlay = defineAsyncComponent(() => import('@/components/PrintOverlay.vue'))

const router = useRouter()
const app = useAppStore()

const detailView = ref(null)
const detailCli = ref('')

onDeactivated(() => {
  if (app.config.keepTabState !== true) {
    detailView.value = null
    detailCli.value = ''
    filterName.value = ''
    filterFrom.value = ''
    filterTo.value = ''
    sortMode.value = 'date-desc'
    showDateRange.value = false
  }
})
const filterName = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const showDateRange = ref(false)
const sortMode = ref('date-desc')
const sortModes = ['date-desc', 'date-asc', 'name-asc', 'name-desc']
const sortLabels = { 'date-desc': 'التاريخ (الأحدث)', 'date-asc': 'التاريخ (الأقدم)', 'name-asc': 'الاسم (أ-ي)', 'name-desc': 'الاسم (ي-أ)' }
const sortLabel = computed(() => sortLabels[sortMode.value])
function toggleSort() { const i = sortModes.indexOf(sortMode.value); sortMode.value = sortModes[(i + 1) % sortModes.length] }
function switchCategory(cat) { detailView.value = cat }
const showPrint = ref(false)
const printTitle = ref('')
const printHtml = ref('')

const cur = computed(() => app.currency)
const month = computed(() => app.selectedMonth)
const clinics = computed(() => app.clinics)

const moRecs = computed(() => {
  return app.records.filter(r => r.date?.startsWith(month.value) && !r.isDebt && !r.isPros && !r.isDebtPayment && r.payment !== 'دين' && !isProsDebtPay(r, app.debts))
})
const moPros = computed(() => app.prosthetics.filter(p => p.date?.startsWith(month.value)))
const moPdPays = computed(() => app.records.filter(r => r.date?.startsWith(month.value) && isProsDebtPay(r, app.debts)))
const moRegDebtPays = computed(() => app.records.filter(r => r.date?.startsWith(month.value) && r.isDebtPayment && !isProsDebtPay(r, app.debts)))
const moDebts = computed(() => app.debts.filter(d => (d.date || '').startsWith(month.value) && d.status !== 'paid'))

function getClinicCash(cli) { return sum(moRecs.value.filter(r => r.clinic === cli && r.payment === 'كاش'), 'amount') + sum(moRegDebtPays.value.filter(r => r.clinic === cli && r.payment === 'كاش'), 'amount') }
function getClinicXfer(cli) { return sum(moRecs.value.filter(r => r.clinic === cli && r.payment !== 'كاش'), 'amount') + sum(moRegDebtPays.value.filter(r => r.clinic === cli && r.payment !== 'كاش'), 'amount') }
function getClinicProsDoc(cli) {
  const cp = moPros.value.filter(p => p.clinic === cli)
  const pd = moPdPays.value.filter(r => r.clinic === cli)
  return prosDocEarnings(cp, pd).pDoc
}
function getClinicDebts(cli) { return moDebts.value.filter(d => d.clinic === cli) }
function getClinicDebtRem(cli) { return getClinicDebts(cli).reduce((s, d) => s + (Number(d.remaining) || 0), 0) }

const totalCash = computed(() => sum(moRecs.value.filter(r => r.payment === 'كاش'), 'amount') + sum(moRegDebtPays.value.filter(r => r.payment === 'كاش'), 'amount'))
const totalXfer = computed(() => sum(moRecs.value.filter(r => r.payment !== 'كاش'), 'amount') + sum(moRegDebtPays.value.filter(r => r.payment !== 'كاش'), 'amount'))
const totalProsDoc = computed(() => prosDocEarnings(moPros.value, moPdPays.value).pDoc)
const grandTotal = computed(() => totalCash.value + totalXfer.value + totalProsDoc.value)
const totalDebtRem = computed(() => moDebts.value.reduce((s, d) => s + (Number(d.remaining) || 0), 0))

function goDebts(clinic) {
  app.activeTab = 'finance'
  router.push({ name: 'finance', query: clinic ? { clinic } : {} })
}

// Detail view
const detailTitle = computed(() => {
  if (!detailView.value) return ''
  const labels = { cash: 'كاش', xfer: 'تحويل', pros: 'تركيبات' }
  return `${detailCli.value} — ${labels[detailView.value] || ''}`
})

const detailItems = computed(() => {
  if (!detailView.value) return []
  const cli = detailCli.value
  const recs = moRecs.value.filter(r => r.clinic === cli)
  const rdp = moRegDebtPays.value.filter(r => r.clinic === cli)
  const pros = moPros.value.filter(p => p.clinic === cli)
  const pdPays = moPdPays.value.filter(r => r.clinic === cli)
  if (detailView.value === 'cash') return sortByNewest([...recs.filter(r => r.payment === 'كاش'), ...rdp.filter(r => r.payment === 'كاش')])
  if (detailView.value === 'xfer') return sortByNewest([...recs.filter(r => r.payment !== 'كاش'), ...rdp.filter(r => r.payment !== 'كاش')])
  return sortByNewest([...pros.filter(p => !p.isDebt), ...pdPays])
})

const detailTotal = computed(() => {
  if (detailView.value === 'pros') {
    const cli = detailCli.value
    return getClinicProsDoc(cli)
  }
  return detailItems.value.reduce((s, r) => s + (Number(r.amount || r.doctorShare) || 0), 0)
})

function prosPayLab(r) {
  if (r._labAmount !== undefined) return Number(r._labAmount) || 0
  const dp = app.config.doctorPct || 50
  const full = Number(r._fullAmount || r.amount || 0)
  const doc = Number(r._docAmount || 0)
  if (dp <= 0 || full <= 0 || doc <= 0) return Math.max(0, full - doc * 100 / dp)
  return Math.max(0, Math.round((full - (doc * 100 / dp)) * 100) / 100)
}
function prosPayDoc(r) {
  if (r._docAmount !== undefined) return Number(r._docAmount) || 0
  const dp = app.config.doctorPct || 50
  const full = Number(r._fullAmount || r.amount || 0)
  const lab = prosPayLab(r)
  return Math.round((full - lab) * dp / 100 * 100) / 100
}
function prosPayClin(r) {
  if (r._docAmount !== undefined) {
    const dp = app.config.doctorPct || 50
    const doc = Number(r._docAmount) || 0
    return dp > 0 ? Math.round(doc * (100 - dp) / dp * 100) / 100 : 0
  }
  const dp = app.config.doctorPct || 50
  const doc = Number(r._docAmount || r.amount || 0)
  if (dp <= 0) return 0
  return Math.round((doc * (100 - dp) / dp) * 100) / 100
}

function getProsDebtPaid(prosId) {
  const d = app.debts.find(x => x.prostheticId === prosId)
  return d ? Number(d.paidAmount || 0) : 0
}
function getProsDebtRemaining(prosId) {
  const d = app.debts.find(x => x.prostheticId === prosId)
  return d ? Number(d.remaining || 0) : 0
}

const prosGrouped = computed(() => {
  if (detailView.value !== 'pros') return []
  const cli = detailCli.value
  const cp = moPros.value.filter(p => p.clinic === cli)
  const pd = moPdPays.value.filter(r => r.clinic === cli)
  const dp = app.config.doctorPct || 50
  const map = {}
  for (const p of cp) {
    const k = p.name || 'بدون اسم'
    if (!map[k]) map[k] = { name: k, items: [], total: 0, docTotal: 0, clinTotal: 0, labTotal: 0 }
    map[k].items.push(p)
    map[k].total += Number(p.total || 0) || 0
    if (!p.isDebt) {
      map[k].labTotal += Number(p.labValue || 0) || 0
      map[k].docTotal += Number(p.doctorShare || 0) || 0
      map[k].clinTotal += Number(p.clinicShare || 0) || 0
    }
  }
  for (const r of pd) {
    const k = r.name || 'بدون اسم'
    if (!map[k]) map[k] = { name: k, items: [], total: 0, docTotal: 0, clinTotal: 0, labTotal: 0 }
    map[k].items.push(r)
    map[k].labTotal += prosPayLab(r)
    map[k].docTotal += prosPayDoc(r)
    map[k].clinTotal += prosPayClin(r)
  }
  return Object.values(map).sort((a, b) => {
    const aDate = a.items.reduce((d, r) => (!d || (r.date && r.date < d)) ? r.date : d, '')
    const bDate = b.items.reduce((d, r) => (!d || (r.date && r.date < d)) ? r.date : d, '')
    return (bDate || '').localeCompare(aDate || '')
  })
})

function matchDate(d) {
  if (!d) return true
  if (filterFrom.value && d < filterFrom.value) return false
  if (filterTo.value && d > filterTo.value) return false
  return true
}
function matchName(name) {
  if (!filterName.value) return true
  return (name || '').includes(filterName.value)
}

function applySorting(arr) {
  const m = sortMode.value
  const sorted = [...arr]
  if (m === 'date-desc') sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  else if (m === 'date-asc') sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  else if (m === 'name-asc') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  else if (m === 'name-desc') sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ar'))
  return sorted
}

const filteredDetailItems = computed(() => {
  return applySorting(detailItems.value.filter(r => matchName(r.name) && matchDate(r.date)))
})

const filteredProsGrouped = computed(() => {
  let groups = prosGrouped.value
  if (filterName.value || filterFrom.value || filterTo.value) {
    const dp = app.config.doctorPct || 50
    groups = groups
      .map(g => {
        if (!matchName(g.name)) return null
        const items = g.items.filter(r => matchDate(r.date))
        if (!items.length) return null
        const total = items.reduce((s, r) => s + (Number(r.total || 0) || 0), 0)
        const labTotal = items.reduce((s, r) => {
          if (r._t === 'p' && r.isDebt) return s
          if (r.isDebtPayment) return s + prosPayLab(r)
          return s + (Number(r.labValue || 0) || 0)
        }, 0)
        const docTotal = items.reduce((s, r) => {
          if (r._t === 'p' && r.isDebt) return s
          if (r.isDebtPayment) return s + prosPayDoc(r)
          return s + (Number(r.doctorShare || 0) || 0)
        }, 0)
        const clinTotal = items.reduce((s, r) => {
          if (r._t === 'p' && r.isDebt) return s
          if (r.isDebtPayment) return s + prosPayClin(r)
          return s + (Number(r.clinicShare || 0) || 0)
        }, 0)
        return { ...g, items, total, docTotal, labTotal, clinTotal }
      })
      .filter(Boolean)
  }
  const m = sortMode.value
  if (m === 'name-asc') groups = [...groups].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  else if (m === 'name-desc') groups = [...groups].sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ar'))
  return groups
})

const filteredDetailTotal = computed(() => {
  if (detailView.value === 'pros') {
    return filteredProsGrouped.value.reduce((s, g) => s + g.docTotal, 0)
  }
  return filteredDetailItems.value.reduce((s, r) => s + (Number(r.amount || r.doctorShare) || 0), 0)
})

function showDetail(type, cli) {
  detailView.value = type
  detailCli.value = cli
  filterName.value = ''
  filterFrom.value = ''
  filterTo.value = ''
}

function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function buildTable(headers, rows, totRow = null) {
  const ths = headers.map(h => `<th>${h}</th>`).join('')
  const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
  const tot = totRow ? `<tr class="total-row">${totRow.map(c => `<td>${c}</td>`).join('')}</tr>` : ''
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}${tot}</tbody></table>`
}

function printDetail() {
  const isP = detailView.value === 'pros'
  const c = cur.value
  const dp = app.config.doctorPct || 50
  const dpR = app.config.doctorPctRegular || dp
  if (isP) {
    const groups = prosGrouped.value
    if (!groups.length) return
    const cli = detailCli.value
    const cp = moPros.value.filter(p => p.clinic === cli)
    const pd = moPdPays.value.filter(r => r.clinic === cli)
    const { pDoc } = prosDocEarnings(cp, pd)
    const nonDebtPros = cp.filter(p => !p.isDebt)
    const pdClinEarnings = pd.reduce((s, r) => s + prosPayClin(r), 0)
    const totalClinShare = nonDebtPros.reduce((s, p) => s + (Number(p.clinicShare) || 0), 0) + pdClinEarnings
    const pdLabPaid = pd.reduce((s, r) => s + prosPayLab(r), 0)
    const totalLabVal = cp.filter(p => !p.isDebt).reduce((s, p) => s + (Number(p.labValue) || 0), 0) + pdLabPaid
    const headers = ['التاريخ', 'الدفع', 'الإجمالي', 'المعمل', 'طبيب (' + dp + '%)', 'عيادة (' + (100 - dp) + '%)']
    let html = `<h1>${_esc(detailTitle.value)}</h1><p class="sub">${_esc(month.value)} — نسبة الطبيب ${dp}%</p>`
    for (const g of groups) {
      html += `<h3 style="margin:14px 0 6px;color:#0a1428;font-size:13px;border-bottom:2px solid #000;padding-bottom:3px">${_esc(g.name)}</h3>`
      const rows = g.items.map(r => {
        const isPros = r._t === 'p'
        if (isPros && r.isDebt) return [_esc(r.date), 'دين', n(r.total || 0) + ' ' + c, n(r.labValue || 0) + ' ' + c, n(r.doctorShare || 0) + ' ' + c + ' <span style="font-size:9px;opacity:.5">(عند السداد)</span>', n(r.clinicShare || 0) + ' ' + c + ' <span style="font-size:9px;opacity:.5">(عند السداد)</span>']
        if (isPros) return [_esc(r.date), _esc(r.payment || ''), n(r.total || 0) + ' ' + c, n(r.labValue || 0) + ' ' + c, n(r.doctorShare || 0) + ' ' + c, n(r.clinicShare || 0) + ' ' + c]
        const fullAmt = Number(r._fullAmount || r.amount || 0)
        const pdLab = prosPayLab(r)
        const pdDoc = prosPayDoc(r)
        const pdClin = prosPayClin(r)
        return [_esc(r.date), _esc(r.payment || ''), 'دفعة ' + n(fullAmt) + ' ' + c, n(Math.round(pdLab * 100) / 100) + ' ' + c, n(Math.round(pdDoc * 100) / 100) + ' ' + c, n(Math.round(pdClin * 100) / 100) + ' ' + c]
      })
      const tot = ['مجموع ' + _esc(g.name), '', n(g.total) + ' ' + c, n(g.labTotal) + ' ' + c, n(g.docTotal) + ' ' + c, n(g.clinTotal) + ' ' + c]
      html += buildTable(headers, rows, tot)
    }
    html += `<h3 style="margin:16px 0 6px;color:#0a1428">الإجمالي الكلي</h3>`
    html += buildTable(['', 'الإجمالي', 'المعمل', 'طبيب (' + dp + '%)', 'عيادة (' + (100 - dp) + '%)'], [], ['المجموع', n(cp.reduce((s, p) => s + (Number(p.total) || 0), 0)) + ' ' + c, n(totalLabVal) + ' ' + c, n(pDoc) + ' ' + c, n(totalClinShare) + ' ' + c])
    printTitle.value = detailTitle.value
    printHtml.value = html
  } else {
    if (!detailItems.value.length) return
    const items = detailItems.value
    const totalAmt = items.reduce((s, r) => s + (+r.amount || 0), 0)
    const totalDoc = Math.round(totalAmt * dpR / 100 * 100) / 100
    const totalClin = Math.round(totalAmt * (100 - dpR) / 100 * 100) / 100
    const headers = ['الاسم', 'التاريخ', 'الخدمة', 'القيمة', 'طبيب (' + dpR + '%)', 'عيادة (' + (100 - dpR) + '%)', 'الدفع']
    const rows = items.map(r => {
      const amt = Number(r.amount || 0) || 0
      return [_esc(r.name), _esc(r.date), _esc(r.service || ''), n(amt) + ' ' + c, n(Math.round(amt * dpR / 100 * 100) / 100) + ' ' + c, n(Math.round(amt * (100 - dpR) / 100 * 100) / 100) + ' ' + c, _esc(r.payment || '')]
    })
    const tot = ['المجموع', '', '', n(totalAmt) + ' ' + c, n(totalDoc) + ' ' + c, n(totalClin) + ' ' + c, '']
    printTitle.value = detailTitle.value
    printHtml.value = `<h1>${_esc(detailTitle.value)}</h1><p class="sub">${_esc(month.value)}</p>${buildTable(headers, rows, tot)}`
  }
  showPrint.value = true
}
</script>
