<template>
  <div class="space-y-2">
    <!-- Search + Server Search -->
    <div class="mb-2 flex gap-2">
      <div class="relative flex-1">
        <input type="text" v-model="searchQuery" class="inp" placeholder=" بحث بالاسم أو رقم الهاتف..." autocomplete="off">
      </div>
      <!-- Filter toggle -->
      <button class="btn-o px-2.5 py-2" style="border-radius:12px" @click="showFilters = !showFilters" :class="{ 'rf-on': showFilters }">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      </button>
    </div>
    <!-- Server search button -->
    <div v-if="searchQuery.trim() && !serverSearching" class="mb-2">
      <button class="btn-o w-full py-2 text-xs font-bold" style="border-radius:12px" @click="searchServer">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        بحث في السيرفر
      </button>
    </div>
    <div v-if="serverSearching" class="mb-2 flex items-center justify-center gap-2 text-xs opacity-50">
      <svg class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 010 20" stroke-linecap="round"/></svg>
      جار البحث في السيرفر...
    </div>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="glass-sm p-3 rounded-xl space-y-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="text-[10px] opacity-50 whitespace-nowrap">العيادة:</span>
        <select v-model="clinicFilter" class="inp text-xs flex-1" style="padding:4px 8px">
          <option value="">الكل</option>
          <option v-for="c in app.clinics" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <!-- Clinic Filter Badge -->
    <div v-if="clinicFilter" class="flex items-center gap-2 mb-2 p-2 rounded-xl" style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.2)">
      <span class="text-[10px] opacity-60">تصفية حسب العيادة:</span>
      <span class="text-xs font-bold" style="color:var(--gold)">{{ clinicFilter }}</span>
      <button @click="clinicFilter = ''" class="text-[10px] opacity-50 px-1.5 py-0.5 rounded" style="background:rgba(255,255,255,.1)">✕ إزالة</button>
    </div>

    <!-- Filter Bar -->
    <div class="rec-filter-bar">
      <button v-for="f in filters" :key="f.key" class="rec-filter-btn" :class="{ 'rf-on': recFilter === f.key }" @click="recFilter = f.key">{{ f.label }}</button>
    </div>

    <!-- Records List -->
    <SkeletonLoader v-if="app.syncing" :count="4" variant="row" />
    <div v-else-if="!filteredRecords.length" class="text-center py-16 opacity-25">
      <svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;display:block;color:var(--gold)"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
      <p class="text-sm font-bold mt-3">{{ emptyLabel }}</p>
    </div>

    <!-- Grouped by clinic when not searching -->
    <template v-if="!searchQuery.trim() && clinicGroups.length">
      <div v-for="group in clinicGroups" :key="group.clinic" class="glass overflow-hidden rounded-2xl">
        <button class="w-full p-4 flex justify-between items-center text-right" @click="toggleClinic(group.key)">
          <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold);flex-shrink:0"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/></svg>
            <div>
              <p class="text-xs font-bold" style="color:var(--gold-l)">{{ group.clinic }}</p>
              <p class="text-[9px] opacity-35">{{ group.items.length }} سجل</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-left text-[9px] opacity-50">
              <span class="text-green-400"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg> {{ n(group.cash) }}</span>
              <span class="text-blue-400 mr-2"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/><path d="M8 15h4"/></svg> {{ n(group.xfer) }}</span>
            </div>
            <span class="acc-arr text-xs opacity-40" :class="{ open: openClinics.has(group.key) }">▼</span>
          </div>
        </button>
        <div class="acc-body" :class="openClinics.has(group.key) ? 'acc-open' : 'acc-closed'" :style="{ maxHeight: openClinics.has(group.key) ? (group.items.length * 90 + 40) + 'px' : '0px' }">
          <div class="px-3 pb-3 space-y-1.5">
            <VirtualScroll
              v-if="openClinics.has(group.key) && group.items.length > 20"
              :items="group.items"
              :itemHeight="80"
              :containerHeight="Math.min(group.items.length * 80, vsContainerHeight)"
              :buffer="5"
            >
              <template #default="{ item }">
                <RecordRow :key="item.id + item._s" :record="item" :debts="debts" :currency="cur" :payment-methods="paymentMethods" :doctor-pct="doctorPct" @edit="editRec" @delete="delRec" @go-debts="goDebts" @open-payment="openPayPopup" @go-patient="goPatient" @update-amount="updateRecAmount" />
              </template>
            </VirtualScroll>
            <template v-else>
              <RecordRow v-for="r in group.items" :key="r.id + r._s" :record="r" :debts="debts" :currency="cur" :payment-methods="paymentMethods" :doctor-pct="doctorPct" @edit="editRec" @delete="delRec" @go-debts="goDebts" @open-payment="openPayPopup" @go-patient="goPatient" @update-amount="updateRecAmount" />
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Flat list when searching -->
    <template v-else-if="searchQuery.trim()">
      <VirtualScroll
        v-if="filteredRecords.length > 20"
        :items="filteredRecords"
        :itemHeight="80"
        :containerHeight="vsContainerHeight"
        :buffer="5"
      >
        <template #default="{ item }">
          <RecordRow :key="item.id + item._s" :record="item" :debts="debts" :currency="cur" :payment-methods="paymentMethods" :doctor-pct="doctorPct" @edit="editRec" @delete="delRec" @go-debts="goDebts" @open-payment="openPayPopup" @go-patient="goPatient" @update-amount="updateRecAmount" />
        </template>
      </VirtualScroll>
      <template v-else>
        <RecordRow v-for="r in filteredRecords" :key="r.id + r._s" :record="r" :debts="debts" :currency="cur" :payment-methods="paymentMethods" :doctor-pct="doctorPct" @edit="editRec" @delete="delRec" @go-debts="goDebts" @open-payment="openPayPopup" @go-patient="goPatient" @update-amount="updateRecAmount" />
      </template>
    </template>

    <!-- Global Debt Payment Popup -->
    <DebtPayPopup :visible="showPayPopup" :debtId="payPopupDebtId" @close="showPayPopup = false" @updated="showPayPopup = false" />
    <DoubleConfirm :visible="dcVisible" :title="dcTitle" :msg="dcMsg" :duration="dcDuration" @confirm="onDcConfirm" @cancel="onDcCancel" />
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onActivated, onDeactivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { fuzzyMatch, fuzzyScore } from '@/utils/search'
import { sortByNewest, sum, isProsDebtPay, n, recDateFilter } from '@/utils/helpers'
import { markMonthDirty, markDebtsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import RecordRow from './components/RecordRow.vue'
import VirtualScroll from '@/components/VirtualScroll.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { useDoubleConfirm } from '@/composables/useDoubleConfirm'

const DebtPayPopup = defineAsyncComponent(() => import('@/components/DebtPayPopup.vue'))
const DoubleConfirm = defineAsyncComponent(() => import('@/components/DoubleConfirm.vue'))

const vsContainerHeight = Math.max(400, window.innerHeight - 220)

const router = useRouter()
const route = useRoute()
const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()
const { dcVisible, dcTitle, dcMsg, dcDuration, dblConfirm, onDcConfirm, onDcCancel } = useDoubleConfirm()

const searchQuery = ref('')
const recFilter = ref('month')
const showFilters = ref(false)
const clinicFilter = ref('')
const serverSearching = ref(false)

async function searchServer() {
  if (navigator.onLine === false) {
    toast('لا يوجد اتصال بالإنترنت')
    return
  }
  serverSearching.value = true
  try {
    const ok = await app.searchRecordsFromServer(auth.uid, searchQuery.value)
    if (!ok) {
      toast('فشل البحث في السيرفر')
    } else if (!filteredRecords.value.length) {
      toast('لم يتم العثور على سجلات')
    }
  } catch {
    toast('خطأ في البحث')
  } finally {
    serverSearching.value = false
  }
}

function handleQueryParams() {
  const q = route.query
  if (q.search) {
    searchQuery.value = q.search
    recFilter.value = 'all'
    router.replace({ name: 'clinics', query: {} })
  }
}
onMounted(handleQueryParams)
onActivated(handleQueryParams)
onDeactivated(() => {
  searchQuery.value = ''
  if (app.config.keepTabState !== true) {
    recFilter.value = 'month'
    clinicFilter.value = ''
    showFilters.value = false
  }
})
const openClinics = ref(new Set())
const showPayPopup = ref(false)
const payPopupDebtId = ref(null)

function openPayPopup(debtId) {
  payPopupDebtId.value = debtId
  showPayPopup.value = true
}

const filters = [
  { key: 'month', label: 'هذا الشهر' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'today', label: 'اليوم' },
  { key: 'all', label: 'الكل' },
]

const cur = computed(() => app.currency)
const debts = computed(() => app.debts)
const paymentMethods = computed(() => app.config?.payments || ['كاش', 'تحويل'])
const doctorPct = computed(() => app.config?.doctorPct || 50)
const month = computed(() => app.selectedMonth)

function matchQuery(q, rec) {
  if (fuzzyMatch(q, rec.name || '')) return true
  const ph = (rec.phone || '').replace(/[^0-9]/g, '')
  const ph2 = (rec.phone2 || '').replace(/[^0-9]/g, '')
  const qClean = q.replace(/[^0-9]/g, '')
  if (qClean && (ph.includes(qClean) || ph2.includes(qClean))) return true
  if ((rec.phone || '').includes(q) || (rec.phone2 || '').includes(q)) return true
  return false
}

const filteredRecords = computed(() => {
  const q = searchQuery.value.trim()
  const cf = clinicFilter.value
  let recsFlt = q
    ? app.records.filter(r => !r.isPros && matchQuery(q, r))
    : app.records.filter(r => recDateFilter(r, recFilter.value, month.value) && !r.isPros)
  let prosFlt = q
    ? app.prosthetics.filter(p => matchQuery(q, p))
    : app.prosthetics.filter(p => recDateFilter(p, recFilter.value, month.value))
  if (cf) {
    recsFlt = recsFlt.filter(r => r.clinic === cf)
    prosFlt = prosFlt.filter(p => p.clinic === cf)
  }
  const all = sortByNewest([
    ...recsFlt.map(r => ({ ...r, _s: 'r' })),
    ...prosFlt.map(p => ({ ...p, _s: 'p', service: 'تركيبات', amount: p.doctorShare })),
  ])
  if (q) {
    all.sort((a, b) => fuzzyScore(q, a.name || '') - fuzzyScore(q, b.name || ''))
  }
  return all
})

function hasLinkedDebt(r) {
  return r._s === 'p'
    ? debts.value.some(d => d.prostheticId === r.id)
    : debts.value.some(d => d.recordId === r.id)
}

function paidAmountFor(r) {
  if (r.isDebtPayment) return +r.amount || 0
  if (hasLinkedDebt(r)) return 0
  return +r.amount || 0
}

const clinicGroups = computed(() => {
  const all = filteredRecords.value
  const clinics = [...new Set(all.map(r => r.clinic || '—'))]
  return clinics.map(cli => {
    const items = all.filter(r => (r.clinic || '—') === cli)
    const cash = items.filter(r => r.payment === 'كاش').reduce((s, r) => s + paidAmountFor(r), 0)
    const xfer = items.filter(r => r.payment !== 'كاش' && r.payment !== 'دين').reduce((s, r) => s + paidAmountFor(r), 0)
    const key = 'rec-' + cli.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
    return { clinic: cli, key, items, cash, xfer }
  })
})

const emptyLabel = computed(() => {
  if (searchQuery.value.trim()) return 'لا توجد نتائج للبحث'
  const labels = { month: 'لا توجد سجلات في هذا الشهر', week: 'لا توجد سجلات هذا الأسبوع', today: 'لا توجد سجلات اليوم', all: 'لا توجد سجلات' }
  return labels[recFilter.value] || labels.month
})

function toggleClinic(key) {
  if (openClinics.value.has(key)) openClinics.value.delete(key)
  else openClinics.value.add(key)
  openClinics.value = new Set(openClinics.value) // trigger reactivity
}

function goDebts() {
  app.activeTab = 'finance'
  router.push({ name: 'finance' })
}

function goPatient(name) {
  if (!name) return
  app.activeTab = 'clinics'
  router.push({ name: 'clinics', query: { search: name } })
}

function editRec(id, type) {
  app.activeTab = 'home'
  router.push({ name: 'home', query: { edit: id, type } })
}

function updateRecAmount(id, newAmount, type, changes) {
  const now_mod = Date.now()
  const extra = changes || {}
  if (type === 'p') {
    const idx = app.prosthetics.findIndex(x => x.id === id)
    if (idx < 0) return
    const old = app.prosthetics[idx]
    const effectiveAmount = extra.amount !== undefined ? extra.amount : newAmount
    const lab = extra.labValue !== undefined ? extra.labValue : Number(old.labValue || 0)
    const net = effectiveAmount - lab
    const dp = app.config.doctorPct || 50
    const updPros = [...app.prosthetics]
    const prosUpdates = { total: effectiveAmount, labValue: lab, doctorShare: net * (dp / 100), clinicShare: net * ((100 - dp) / 100), _mod: now_mod }
    if (extra.date) prosUpdates.date = extra.date
    if (extra.payment) prosUpdates.payment = extra.payment
    updPros[idx] = { ...old, ...prosUpdates }
    app.prosthetics = updPros
    markMonthDirty(old.date)
    if (extra.date && extra.date !== old.date) markMonthDirty(extra.date)
    enqueueSyncAction({ type: 'prosthetic_update', table: 'prosthetics', recordId: id, data: { id, ...prosUpdates } }).catch(e => console.warn('[UpdateAmount] enqueue pros:', e))
    const dIdx = app.debts.findIndex(d => d.prostheticId === id)
    if (dIdx >= 0) {
      const debt = { ...app.debts[dIdx] }
      const paid = Number(debt.paidAmount) || 0
      debt.totalAmount = effectiveAmount
      debt.total = effectiveAmount
      debt.remaining = Math.max(0, effectiveAmount - paid)
      if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
      else if (paid > 0.01) debt.status = 'partial'
      else debt.status = 'unpaid'
      debt._mod = now_mod
      const updDebts = [...app.debts]
      updDebts[dIdx] = debt
      app.debts = updDebts
      markDebtsDirty()
    }
  } else {
    const idx = app.records.findIndex(x => x.id === id)
    if (idx < 0) return
    const old = app.records[idx]
    const recUpdates = { amount: newAmount, _mod: now_mod }
    if (old._fullAmount !== undefined || old.isDebtPayment) recUpdates._fullAmount = newAmount
    if (extra.date) recUpdates.date = extra.date
    if (extra.payment) recUpdates.payment = extra.payment

    // Recalculate lab/doctor/clinic for prosthetic debt payments
    if (old.isDebtPayment && old.debtId) {
      const linkedDebt = app.debts.find(d => d.id === old.debtId)
      if (linkedDebt && linkedDebt.type === 'prosthetic') {
        const dp = app.config.doctorPct || 50
        const totalDebtAmt = Number(linkedDebt.totalAmount || linkedDebt.total || 0) || 0
        const labValue = Number(linkedDebt.labValue || 0) || 0
        const oldLabPaid = Number(linkedDebt.labPaid || 0) || 0
        const labRemaining = Math.max(0, labValue - oldLabPaid + (Number(old._labAmount || 0) || 0))
        const newLabAmount = Math.min(newAmount, labRemaining)
        const newToProfit = Math.max(0, newAmount - newLabAmount)
        const newDocAmount = newToProfit * (dp / 100)
        recUpdates._labAmount = newLabAmount
        recUpdates._docAmount = newDocAmount
      }
    }

    const updRecs = [...app.records]
    updRecs[idx] = { ...old, ...recUpdates }
    app.records = updRecs
    markMonthDirty(old.date)
    if (extra.date && extra.date !== old.date) markMonthDirty(extra.date)
    enqueueSyncAction({ type: 'record_update', table: 'records', recordId: id, data: { id, ...recUpdates } }).catch(e => console.warn('[UpdateAmount] enqueue rec:', e))
    if (old.isDebtPayment && old.debtId) {
      const dIdx = app.debts.findIndex(d => d.id === old.debtId)
      if (dIdx >= 0) {
        const debt = { ...app.debts[dIdx] }
        const oldPayAmt = Number(old.amount || 0) || 0
        const diff = newAmount - oldPayAmt
        debt.paidAmount = Math.max(0, (Number(debt.paidAmount) || 0) + diff)
        const totalDebtAmt = Number(debt.totalAmount || debt.total || 0) || 0
        debt.remaining = Math.max(0, totalDebtAmt - debt.paidAmount)
        if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
        else if (debt.paidAmount > 0.01) debt.status = 'partial'
        else debt.status = 'unpaid'
        // Recalculate labPaid and doctorEarned for prosthetic debts
        if (debt.type === 'prosthetic') {
          const oldLab = Number(old._labAmount || 0) || 0
          const newLab = Number(recUpdates._labAmount || 0) || 0
          debt.labPaid = Math.max(0, (Number(debt.labPaid) || 0) - oldLab + newLab)
          const oldDoc = Number(old._docAmount || 0) || 0
          const newDoc = Number(recUpdates._docAmount || 0) || 0
          debt.doctorEarned = Math.max(0, (Number(debt.doctorEarned) || 0) - oldDoc + newDoc)
        }
        if (debt.installments?.length) {
          let instIdx = debt.installments.findIndex(ins => ins.recordId === id)
          if (instIdx < 0) instIdx = debt.installments.findIndex(ins => ins.date === old.date && (Number(ins.amount) || 0) === oldPayAmt)
          if (instIdx >= 0) debt.installments[instIdx] = { ...debt.installments[instIdx], amount: newAmount }
        }
        debt._mod = now_mod
        const updDebts = [...app.debts]
        updDebts[dIdx] = debt
        app.debts = updDebts
        markDebtsDirty()
        enqueueSyncAction({ type: 'debt_update', table: 'debts', recordId: debt.id, data: { id: debt.id, paidAmount: debt.paidAmount, remaining: debt.remaining, status: debt.status, installments: debt.installments, labPaid: debt.labPaid, doctorEarned: debt.doctorEarned, _mod: now_mod } }).catch(e => console.warn('[UpdateAmount] enqueue debt:', e))
      }
    } else {
      const dIdx = app.debts.findIndex(d => d.recordId === id)
      if (dIdx >= 0) {
        const debt = { ...app.debts[dIdx] }
        const paid = Number(debt.paidAmount) || 0
        debt.totalAmount = newAmount
        debt.total = newAmount
        debt.remaining = Math.max(0, newAmount - paid)
        if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
        else if (paid > 0.01) debt.status = 'partial'
        else debt.status = 'unpaid'
        debt._mod = now_mod
        const updDebts = [...app.debts]
        updDebts[dIdx] = debt
        app.debts = updDebts
        markDebtsDirty()
      }
    }
  }
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم تحديث القيمة بنجاح')
}

function delRec(id, type) {
  const recName = type === 'p' ? (app.prosthetics.find(x => x.id === id)?.name || '') : (app.records.find(x => x.id === id)?.name || '')
  dblConfirm('حذف السجل نهائياً؟', 'المريض: ' + (recName || '—'), () => doDelRec(id, type), 'records')
}

function doDelRec(id, type) {
  const deletedIds = [id]
  if (type === 'p') {
    const p = app.prosthetics.find(x => x.id === id)
    markMonthDirty(p?.date)
    if (p?.isDebt) {
      const debt = app.debts.find(d => d.prostheticId === id)
      if (debt) {
        const relatedPayRecs = app.records.filter(r => r.isDebtPayment && r.debtId === debt.id)
        relatedPayRecs.forEach(r => { deletedIds.push(r.id); markMonthDirty(r.date) })
        app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === debt.id))
        deletedIds.push(debt.id)
        app.debts = app.debts.filter(d => d.prostheticId !== id)
        markDebtsDirty()
      }
    }
    app.trackDeletionBatch(deletedIds)
    deletedIds.forEach(did => {
      enqueueSyncAction({ type: 'record_delete', table: did === id ? 'prosthetics' : 'records', recordId: did, data: { id: did } }).catch(e => console.warn('[Delete] enqueue failed:', e))
    })
    app.deleteProsthetic(id)
  } else {
    const r = app.records.find(x => x.id === id)
    markMonthDirty(r?.date)
    if (r?.isDebtPayment && r.debtId) {
      const dIdx = app.debts.findIndex(d => d.id === r.debtId)
      if (dIdx >= 0) {
        const debt = { ...app.debts[dIdx] }
        const recAmt = Number(r.amount) || 0
        const ip = debt.type === 'prosthetic'
        let fullPayAmt = recAmt
        if (debt.installments?.length) {
          // Match by recordId first (most reliable), then fallback to date+amount
          const inst = debt.installments.find(ins => ins.recordId === id)
            || (ip && debt.installments.find(ins => ins.date === r.date && r._mod && Math.abs((ins._mod || 0) - r._mod) < 2000))
            || debt.installments.find(ins => ins.date === r.date)
          if (inst) fullPayAmt = Number(inst.amount) || recAmt
        }
        debt.paidAmount = Math.max(0, (Number(debt.paidAmount) || 0) - fullPayAmt)
        const totalDebtAmt = Number(debt.totalAmount || debt.total || 0) || 0
        debt.remaining = Math.max(0, totalDebtAmt - (Number(debt.paidAmount) || 0))
        if (debt.remaining > 0.01) debt.status = debt.paidAmount > 0.01 ? 'partial' : 'unpaid'
        else { debt.status = 'paid'; debt.remaining = 0 }
        if (ip) {
          const labVal = Number(debt.labValue || 0)
          debt.labPaid = Math.min(labVal, debt.paidAmount)
          const profitPortion = Math.max(0, debt.paidAmount - debt.labPaid)
          const dp = app.config.doctorPct || 50
          debt.doctorEarned = profitPortion * (dp / 100)
        }
        if (debt.installments?.length) {
          // Remove by recordId first, then fallback to date+amount match
          let instIdx = debt.installments.findIndex(ins => ins.recordId === id)
          if (instIdx < 0) {
            instIdx = ip
              ? debt.installments.findIndex(ins => ins.date === r.date && (Number(ins.amount) || 0) === fullPayAmt)
              : debt.installments.findIndex(ins => ins.date === r.date && (Number(ins.amount) || 0) === recAmt)
          }
          if (instIdx >= 0) debt.installments.splice(instIdx, 1)
        }
        debt._mod = Date.now()
        const updDebts = [...app.debts]
        updDebts[dIdx] = debt
        app.debts = updDebts
        markDebtsDirty()
      }
    }
    if (r?.isDebt) {
      const debt = app.debts.find(d => d.recordId === id)
      if (debt) {
        const relatedPayRecs = app.records.filter(rec => rec.isDebtPayment && rec.debtId === debt.id)
        relatedPayRecs.forEach(rec => { deletedIds.push(rec.id); markMonthDirty(rec.date) })
        app.records = app.records.filter(rec => !(rec.isDebtPayment && rec.debtId === debt.id))
        deletedIds.push(debt.id)
        app.debts = app.debts.filter(d => d.recordId !== id)
        markDebtsDirty()
      }
    }
    app.trackDeletionBatch(deletedIds)
    deletedIds.forEach(did => {
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: did, data: { id: did } }).catch(e => console.warn('[Delete] enqueue failed:', e))
    })
    app.deleteRecord(id)
  }
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم الحذف وتحديث الأرصدة')
}
</script>
