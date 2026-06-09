<template>
  <div class="space-y-4">
    <!-- Search + Tools (single compact row) -->
    <div class="mb-2 flex items-center gap-2">
      <div class="relative flex-1">
        <input type="text" v-model="searchQuery" class="inp text-xs" style="padding:8px 36px 8px 10px;height:36px" placeholder="بحث بالاسم..." autocomplete="off">
        <svg class="absolute top-1/2 right-2.5 -translate-y-1/2 opacity-30" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </div>
      <!-- Tools dropdown (merged: settings + filter) -->
      <div class="kebab-wrap">
        <button class="btn-o" style="border-radius:10px;padding:7px 10px;height:36px" @click.stop="showTools = !showTools" :class="{ 'rf-on': showTools || clinicFilter }">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </button>
        <Transition name="kebab-fade">
          <div v-if="showTools" class="kebab-menu" @click.stop>
            <!-- Server search -->
            <button v-if="searchQuery.trim() && !serverSearching" class="kebab-item kebab-blue" @click="showTools = false; searchDebtsServer()">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              بحث في السيرفر
            </button>
            <!-- Load all debts -->
            <button class="kebab-item" :disabled="loadingAllDebts" @click="showTools = false; loadAllDebts()">
              <svg v-if="loadingAllDebts" class="animate-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 010 20" stroke-linecap="round"/></svg>
              <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {{ loadingAllDebts ? 'جار التحميل...' : 'سحب كل الديون' }}
            </button>
            <div class="kebab-divider"></div>
            <!-- Clinic filter -->
            <div class="kebab-filter-section">
              <span class="text-[10px] opacity-50">تصفية حسب العيادة:</span>
              <select v-model="clinicFilter" class="inp text-xs mt-1" style="padding:4px 8px;font-size:11px">
                <option value="">الكل</option>
                <option v-for="c in app.clinics" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Server searching indicator -->
    <div v-if="serverSearching" class="mb-2 flex items-center justify-center gap-2 text-xs opacity-50">
      <svg class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 010 20" stroke-linecap="round"/></svg>
      جار البحث...
    </div>

    <!-- Clinic Filter Badge -->
    <div v-if="clinicFilter" class="flex items-center gap-2 mb-2 p-2 rounded-xl" style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.2)">
      <span class="text-[10px] opacity-60">العيادة:</span>
      <span class="text-xs font-bold" style="color:var(--gold)">{{ clinicFilter }}</span>
      <button @click="clinicFilter = ''" class="text-[10px] opacity-50 px-1.5 py-0.5 rounded" style="background:rgba(255,255,255,.1)">✕</button>
    </div>

    <!-- Filter Buttons -->
    <div class="rec-filter-bar mb-2">
      <button class="rec-filter-btn" :class="{ 'rf-on': debtFilter === 'active' }" @click="debtFilter = 'active'">نشطة ({{ activeCount }})</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': debtFilter === 'paid' }" @click="debtFilter = 'paid'">مسددة ({{ paidCount }})</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': debtFilter === 'all' }" @click="debtFilter = 'all'">الكل</button>
    </div>

    <!-- Print per clinic -->
    <div v-if="debtClinics.length && debtFilter !== 'paid'" class="flex flex-wrap gap-1.5 mb-2">
      <button v-for="cli in debtClinics" :key="cli" class="btn-o px-2.5 py-1.5 text-[10px] flex items-center gap-1" style="border-radius:10px" @click="printClinicDebts(cli)">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        طباعة ديون {{ cli }}
      </button>
    </div>

    <!-- Empty -->
    <SkeletonLoader v-if="app.syncing" :count="3" variant="card" />
    <div v-else-if="!filteredDebts.length" class="text-center py-16 opacity-25">
      <svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;display:block;color:var(--gold)"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
      <p class="text-sm font-bold mt-3">لا توجد ديون</p>
    </div>

    <!-- Debt Cards -->
    <VirtualScroll
      v-if="filteredDebts.length"
      :items="filteredDebts"
      :itemHeight="180"
      :containerHeight="vsContainerHeight"
      :buffer="3"
    >
      <template #default="{ item }">
        <DebtCard :key="item.id" :debt="item" :currency="cur" :doctor-pct="doctorPct"
          @pay="openInstModal" @edit="openEditModal" @delete="delDebt" @forgive="forgiveDebt" @view-payments="openPayPopup" @go-patient="goPatient" @edit-source="editSourceRecord" />
      </template>
    </VirtualScroll>

    <!-- Installment Modal -->
    <Teleport to="body">
      <div v-if="showInstModal" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="closeInstModal">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl">
          <h3 class="font-bold text-sm" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
            تسجيل دفعة
          </h3>
          <div class="space-y-1.5">
            <div class="flex justify-between"><span class="opacity-50 text-xs">المتبقي:</span><span class="n font-black text-red-400">{{ n(instDebt?.remaining || 0) }} {{ cur }}</span></div>
            <template v-if="instDebt?.type === 'prosthetic' && instLabRem > 0">
              <div class="flex justify-between"><span class="opacity-50 text-xs">المعمل المتبقي:</span><span class="n text-orange-400">{{ n(instLabRem) }} {{ cur }}</span></div>
              <p class="text-[9px] text-orange-300 border-t border-white/10 pt-1.5">⚠ تُخصم أولاً من المعمل ثم الربح</p>
            </template>
          </div>
          <input type="number" v-model.number="instAmt" class="inp" placeholder="قيمة الدفعة" min="0" @input="previewInst">
          <input type="date" v-model="instDate" class="inp text-xs">
          <select v-model="instPay" class="inp text-xs">
            <option v-for="p in payments" :key="p">{{ p }}</option>
          </select>
          <!-- Preview -->
          <div v-if="instPreview" class="glass-sm p-3 space-y-1.5 rounded-xl">
            <p class="opacity-50 font-bold text-xs mb-1">معاينة:</p>
            <template v-if="instDebt?.type === 'prosthetic'">
              <div v-if="instPreview.toLab > 0" class="flex justify-between"><span class="opacity-50 text-xs">للمعمل:</span><span class="n text-orange-400">{{ n(instPreview.toLab) }} {{ cur }}</span></div>
              <template v-if="instPreview.toProfit > 0">
                <div class="flex justify-between"><span class="opacity-50 text-xs">ربح الطبيب ({{ doctorPct }}%):</span><span class="n text-green-400">{{ n(instPreview.docShare) }} {{ cur }}</span></div>
                <div class="flex justify-between"><span class="opacity-50 text-xs">ربح العيادة ({{ 100 - doctorPct }}%):</span><span class="n text-blue-400">{{ n(instPreview.clinShare) }} {{ cur }}</span></div>
              </template>
              <p v-else class="text-orange-300 text-xs">كل الدفعة للمعمل فقط</p>
            </template>
            <template v-else>
              <div class="flex justify-between"><span class="opacity-50 text-xs">قيمة الدفعة:</span><span class="n text-green-400">{{ n(instAmt) }} {{ cur }}</span></div>
            </template>
          </div>
          <div class="flex gap-2">
            <button @click="confirmInst" class="btn-g flex-1 py-3 text-xs font-bold">تأكيد الدفعة</button>
            <button @click="closeInstModal" class="btn-o px-4 py-3 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Debt Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="closeEditModal">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl">
          <h3 class="font-bold text-sm" style="color:var(--gold)">تعديل بيانات الدين</h3>
          <input type="text" v-model="editName" class="inp" placeholder="اسم المريض">
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">المبلغ الإجمالي ({{ cur }})</label>
            <input type="number" v-model.number="editTotal" class="inp" placeholder="المبلغ الإجمالي" min="0">
            <p v-if="editTotalChanged" class="text-[9px] text-orange-300 mt-1">⚠ سيتم إعادة حساب المتبقي تلقائياً</p>
          </div>
          <input type="tel" v-model="editPhone" class="inp" placeholder="رقم الهاتف">
          <textarea v-model="editNotes" class="inp h-16 resize-none text-xs" placeholder="ملاحظات"></textarea>
          <div class="flex gap-2">
            <button @click="confirmEditDebt" class="btn-g flex-1 py-3 text-xs font-bold">حفظ</button>
            <button @click="closeEditModal" class="btn-o px-4 py-3 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Payment History Popup -->
    <Teleport to="body">
      <div v-if="showPayPopup" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="closePayPopup">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl max-h-[80vh] overflow-y-auto">
          <h3 class="font-bold text-sm" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
            سجل الدفعات — {{ payPopupDebt?.name }}
          </h3>
          <div v-if="payPopupDebt" class="glass-sm p-3 space-y-2 rounded-xl">
            <div class="flex justify-between items-center mb-1">
              <span class="sec-h text-[10px]">معلومات الدين</span>
              <span :class="payPopupDebt.status === 'paid' ? 'b-debt-settled' : 'b-unpaid'">{{ payPopupDebt.status === 'paid' ? 'مسدد بالكامل' : 'غير مسدد' }}</span>
            </div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">المريض:</span><span class="font-black text-sm cursor-pointer" style="color:var(--gold)" @click="closePayPopup(); goPatient(payPopupDebt.name)">{{ payPopupDebt.name }}</span></div>
            <div v-if="payPopupDebt.phone" class="flex justify-between items-center"><span class="opacity-50 text-xs">الهاتف:</span><a :href="'tel:' + payPopupDebt.phone" class="text-blue-400 text-xs">{{ payPopupDebt.phone }}</a></div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">المبلغ الكلي:</span><span class="n font-bold text-yellow-400">{{ n(payPopupDebt.totalAmount || payPopupDebt.total || 0) }} {{ cur }}</span></div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">المدفوع:</span><span class="n font-bold text-green-400">{{ n(payPopupDebt.paidAmount || 0) }} {{ cur }}</span></div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">المتبقي:</span><span class="n font-bold text-red-400">{{ n(payPopupDebt.remaining || 0) }} {{ cur }}</span></div>
            <!-- Progress -->
            <div class="pt-2">
              <div class="w-full h-2 rounded-full overflow-hidden" style="background:rgba(255,255,255,.1)">
                <div class="h-full rounded-full transition-all" :style="{ width: payPct + '%', background: payPct >= 100 ? 'var(--green)' : 'var(--gold)' }"></div>
              </div>
              <p class="text-[9px] opacity-40 mt-1 text-center"><span class="n">{{ payPct }}%</span> مسدد</p>
            </div>
          </div>
          <!-- Installment list -->
          <div v-if="payPopupDebt?.installments?.length" class="space-y-2">
            <span class="sec-h text-[10px]">الدفعات</span>
            <div v-for="(inst, i) in payPopupDebt.installments" :key="inst.id || i" class="row-card p-3 flex justify-between items-center">
              <div>
                <p class="text-xs font-bold text-green-400"><span class="n">{{ n(inst.amount) }}</span> {{ cur }}</p>
                <p class="text-[9px] opacity-35">{{ inst.date }} — {{ inst.payment }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] opacity-40">#{{ i + 1 }}</span>
                <button @click="cancelPayPopupInst(i)" class="glass-sm w-7 h-7 flex items-center justify-center rounded-lg" style="color:#f87171;flex-shrink:0" :title="cancelConfirmIdx === i ? 'اضغط مرة ثانية للتأكيد' : 'إلغاء الدفعة'">
                  <svg v-if="cancelConfirmIdx !== i" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  <span v-else class="text-[8px] font-bold">تأكيد</span>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 opacity-30 text-xs">لا توجد دفعات مسجلة</div>
          <button @click="closePayPopup" class="btn-o w-full py-2.5 text-xs">إغلاق</button>
        </div>
      </div>
    </Teleport>
    <DoubleConfirm :visible="dcVisible" :title="dcTitle" :msg="dcMsg" :duration="dcDuration" @confirm="onDcConfirm" @cancel="onDcCancel" />
    <PrintOverlay :visible="printVisible" :title="printTitle" :html="printHtml" @close="printVisible = false" />
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { fuzzyMatch, fuzzyScore } from '@/utils/search'
import { sortByNewest, n } from '@/utils/helpers'
import { markMonthDirty, markDebtsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import DebtCard from './components/DebtCard.vue'
import VirtualScroll from '@/components/VirtualScroll.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { useDoubleConfirm } from '@/composables/useDoubleConfirm'
import { getCurrentDate } from '@/utils/format'
import { generateId } from '@/utils/uid'

const DoubleConfirm = defineAsyncComponent(() => import('@/components/DoubleConfirm.vue'))
const PrintOverlay = defineAsyncComponent(() => import('@/components/PrintOverlay.vue'))

const vsContainerHeight = Math.max(400, window.innerHeight - 220)

const router = useRouter()
const route = useRoute()
const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()
const { dcVisible, dcTitle, dcMsg, dcDuration, dblConfirm, onDcConfirm, onDcCancel } = useDoubleConfirm()

const searchQuery = ref('')
const clinicFilter = ref('')
const debtFilter = ref('active')
const loadingAllDebts = ref(false)
const showTools = ref(false)
const serverSearching = ref(false)
let _lastServerSearch = 0
const SERVER_SEARCH_COOLDOWN = 2000

async function searchDebtsServer() {
  const now = Date.now()
  if (now - _lastServerSearch < SERVER_SEARCH_COOLDOWN) {
    toast('\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0642\u0628\u0644 \u0627\u0644\u0628\u062d\u062b \u0645\u0631\u0629 \u0623\u062e\u0631\u0649')
    return
  }
  _lastServerSearch = now
  if (navigator.onLine === false) {
    toast('لا يوجد اتصال بالإنترنت')
    return
  }
  serverSearching.value = true
  try {
    const ok = await app.searchDebtsFromServer(auth.uid, searchQuery.value)
    if (!ok) {
      toast('فشل البحث في السيرفر')
    } else if (!filteredDebts.value.length) {
      toast('لم يتم العثور على ديون')
    }
  } catch {
    toast('خطأ في البحث')
  } finally {
    serverSearching.value = false
  }
}

async function loadAllDebts() {
  if (navigator.onLine === false) {
    toast('لا يوجد اتصال بالإنترنت')
    return
  }
  loadingAllDebts.value = true
  try {
    const ok = await app.loadAllDebts(auth.uid)
    if (ok) {
      toast('تم تحميل جميع الديون بنجاح')
    } else {
      toast('فشل تحميل الديون')
    }
  } catch {
    toast('خطأ في تحميل الديون')
  } finally {
    loadingAllDebts.value = false
  }
}

function handleQueryParams() {
  const q = route.query
  if (q.clinic) {
    clinicFilter.value = q.clinic
    router.replace({ name: 'finance', query: {} })
  }
  if (q.search) {
    searchQuery.value = q.search
    router.replace({ name: 'finance', query: {} })
  }
}
function closeTools() { showTools.value = false }
onMounted(() => { handleQueryParams(); document.addEventListener('click', closeTools) })
onBeforeUnmount(() => document.removeEventListener('click', closeTools))
onActivated(handleQueryParams)
onDeactivated(() => {
  searchQuery.value = ''
  if (app.config.keepTabState !== true) {
    debtFilter.value = 'active'
    clinicFilter.value = ''
    showTools.value = false
  }
})
const showInstModal = ref(false)
const showEditModal = ref(false)
const showPayPopup = ref(false)
const instDebtId = ref(null)
const instAmt = ref(null)
const instDate = ref(getCurrentDate())
const instPay = ref('')
const instPreview = ref(null)
const editDebtId = ref(null)
const editName = ref('')
const editPhone = ref('')
const editNotes = ref('')
const editTotal = ref(null)
const editOriginalTotal = ref(null)
const payPopupDebtId = ref(null)
const editTotalChanged = computed(() => editTotal.value !== null && editOriginalTotal.value !== null && editTotal.value !== editOriginalTotal.value)

const cur = computed(() => app.currency)
const payments = computed(() => app.payments)
const doctorPct = computed(() => app.config.doctorPct || 50)

const activeCount = computed(() => app.debts.filter(d => d.status !== 'paid').length)
const paidCount = computed(() => app.debts.filter(d => d.status === 'paid').length)
const printVisible = ref(false)
const printTitle = ref('')
const printHtml = ref('')

const debtClinics = computed(() => {
  const activeDebts = app.debts.filter(d => d.status !== 'paid' && (Number(d.remaining) || 0) > 0)
  return [...new Set(activeDebts.map(d => d.clinic).filter(Boolean))]
})

function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function printClinicDebts(clinic) {
  const currency = _esc(app.currency)
  const activeDebts = app.debts
    .filter(d => d.clinic === clinic && d.status !== 'paid' && (Number(d.remaining) || 0) > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  if (!activeDebts.length) { toast('لا توجد ديون متبقية لهذه العيادة'); return }
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  let totalRemaining = 0
  let idx = 0
  const rows = activeDebts.map(d => {
    idx++
    const rem = Number(d.remaining) || 0
    const total = Number(d.totalAmount || d.total || 0)
    const paid = Number(d.paidAmount || 0)
    const phone = _esc(d.phone || '')
    totalRemaining += rem
    return `<tr><td style="text-align:center">${idx}</td><td style="font-weight:700">${_esc(d.name || '—')}</td><td>${phone || '—'}</td><td>${_esc(d.service || '—')}</td><td style="text-align:center">${n(total)}</td><td style="text-align:center">${n(paid)}</td><td style="text-align:center;font-weight:700;color:#dc2626">${n(rem)}</td></tr>`
  }).join('')
  printTitle.value = `ديون متبقية — ${clinic}`
  printHtml.value = `
<div class="sec-title"><div class="sec-dot"></div>الديون المتبقية — ${_esc(clinic)}</div>
<div class="info-grid">
  <div class="info-cell"><div class="lbl">العيادة</div><div class="val">${_esc(clinic)}</div></div>
  <div class="info-cell"><div class="lbl">عدد المدينين</div><div class="val">${activeDebts.length}</div></div>
  <div class="info-cell"><div class="lbl">تاريخ التقرير</div><div class="val">${today}</div></div>
</div>
<table><thead><tr><th style="width:30px;text-align:center">#</th><th>اسم المريض</th><th style="width:90px">رقم الهاتف</th><th>الخدمة</th><th style="width:70px;text-align:center">الإجمالي</th><th style="width:70px;text-align:center">المدفوع</th><th style="width:70px;text-align:center">المتبقي</th></tr></thead>
<tbody>${rows}</tbody>
<tr class="total-row"><td></td><td style="font-weight:900">المجموع</td><td></td><td></td><td></td><td></td><td style="text-align:center;font-weight:900;color:#dc2626">${n(totalRemaining)} ${currency}</td></tr>
</table>`
  printVisible.value = true
}

const filteredDebts = computed(() => {
  let list = app.debts
  const q = searchQuery.value.trim()
  if (q) list = list.filter(d => fuzzyMatch(q, d.name || ''))
  if (clinicFilter.value) list = list.filter(d => d.clinic === clinicFilter.value)
  if (debtFilter.value === 'active') list = list.filter(d => d.status !== 'paid')
  else if (debtFilter.value === 'paid') list = list.filter(d => d.status === 'paid')
  return sortByNewest(list)
})

const instDebt = computed(() => app.debts.find(d => d.id === instDebtId.value))
const instLabRem = computed(() => {
  const d = instDebt.value
  if (!d || d.type !== 'prosthetic') return 0
  return Math.max(0, (Number(d.labValue) || 0) - (Number(d.labPaid) || 0))
})

function openInstModal(id) {
  instDebtId.value = id
  instAmt.value = null
  instDate.value = getCurrentDate()
  instPay.value = payments.value[0] || 'كاش'
  instPreview.value = null
  showInstModal.value = true
}

function previewInst() {
  const d = instDebt.value
  if (!d || !instAmt.value || instAmt.value <= 0) { instPreview.value = null; return }
  const ip = d.type === 'prosthetic'
  const labRem = ip ? Math.max(0, (Number(d.labValue) || 0) - (Number(d.labPaid) || 0)) : 0
  const toLab = ip ? Math.min(instAmt.value, labRem) : 0
  const toProfit = instAmt.value - toLab
  const dp = doctorPct.value
  instPreview.value = {
    toLab,
    toProfit,
    docShare: toProfit * (dp / 100),
    clinShare: toProfit * ((100 - dp) / 100),
  }
}

function confirmInst() {
  const dIdx = app.debts.findIndex(d => d.id === instDebtId.value)
  if (dIdx < 0) return
  const debt = { ...app.debts[dIdx] }
  const amt = instAmt.value
  const date = instDate.value
  const pay = instPay.value
  if (isNaN(amt) || amt <= 0) { toast('يرجى إدخال قيمة دفعة صحيحة'); return }
  if (!date) { toast('يرجى اختيار تاريخ الدفعة'); return }
  if (amt > (Number(debt.remaining) || 0) + 0.01) { toast('الدفعة أكبر من المتبقي (' + n(debt.remaining || 0) + ' ' + cur.value + ')'); return }

  const ip = debt.type === 'prosthetic'
  const labRem = ip ? Math.max(0, (Number(debt.labValue) || 0) - (Number(debt.labPaid) || 0)) : 0
  const toLab = ip ? Math.min(amt, labRem) : 0
  const toProfit = amt - toLab
  const dp = doctorPct.value

  debt.installments = debt.installments || []
  const instId = generateId()
  debt.paidAmount = (Number(debt.paidAmount) || 0) + amt
  debt.remaining = Math.max(0, (Number(debt.remaining) || 0) - amt)
  const isFull = debt.remaining <= 0.01

  if (ip) {
    debt.labPaid = (Number(debt.labPaid) || 0) + toLab
    const dProfit = toProfit > 0 ? toProfit * (dp / 100) : 0
    if (toProfit > 0) {
      debt.doctorEarned = (Number(debt.doctorEarned) || 0) + dProfit
    }
    const svcLabel = debt.service ? 'دفعة تركيبات — ' + debt.service : 'تركيبات (دفعة دين)'
    const payRecId = generateId()
    debt.installments.push({ id: instId, amount: amt, date, payment: pay, recordId: payRecId })
    app.records = [...app.records, {
      id: payRecId, uid: auth.uid, date, name: debt.name,
      amount: amt, _fullAmount: amt,
      _labAmount: toLab, _docAmount: dProfit,
      clinic: debt.clinic, service: svcLabel, payment: pay,
      isDebt: false, isPros: false, isDebtPayment: true, debtId: debt.id,
      debtPaymentType: isFull ? 'full' : 'partial', _mod: Date.now(), _t: 'r',
    }]
  } else {
    const svcLabel = debt.service ? 'دفعة دين — ' + debt.service : 'دفعة دين'
    const payRecId = generateId()
    debt.installments.push({ id: instId, amount: amt, date, payment: pay, recordId: payRecId })
    app.records = [...app.records, {
      id: payRecId, uid: auth.uid, date, name: debt.name,
      amount: amt, _fullAmount: amt, clinic: debt.clinic, service: svcLabel, payment: pay,
      isDebt: false, isPros: false, isDebtPayment: true, debtId: debt.id,
      debtPaymentType: isFull ? 'full' : 'partial', _mod: Date.now(), _t: 'r',
    }]
  }

  if (isFull) { debt.status = 'paid'; debt.remaining = 0 }
  else { debt.status = 'partial' }
  debt._mod = Date.now()
  const updDebts = [...app.debts]
  updDebts[dIdx] = { ...debt }
  app.debts = updDebts
  markMonthDirty(date)
  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast(isFull ? 'تم سداد الدين بالكامل!' : 'تم تسجيل الدفعة')
  closeInstModal()
}

function closeInstModal() { showInstModal.value = false }

function openEditModal(id) {
  const d = app.debts.find(x => x.id === id)
  if (!d) return
  editDebtId.value = id
  editName.value = d.name || ''
  editPhone.value = d.phone || ''
  editNotes.value = d.notes || ''
  const totalAmt = Number(d.totalAmount || d.total || 0)
  editTotal.value = totalAmt
  editOriginalTotal.value = totalAmt
  showEditModal.value = true
}

function confirmEditDebt() {
  const idx = app.debts.findIndex(d => d.id === editDebtId.value)
  if (idx < 0) return
  const debt = { ...app.debts[idx] }
  debt.name = editName.value.trim() || debt.name
  debt.phone = editPhone.value.trim()
  debt.notes = editNotes.value.trim()
  const totalChanged = editTotal.value !== null && editTotal.value > 0 && editTotal.value !== editOriginalTotal.value
  if (totalChanged) {
    const newTotal = editTotal.value
    const paid = Number(debt.paidAmount) || 0
    debt.totalAmount = newTotal
    debt.total = newTotal
    debt.remaining = Math.max(0, newTotal - paid)
    if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
    else if (paid > 0.01) { debt.status = 'partial' }
    else { debt.status = 'unpaid' }
  }
  debt._mod = Date.now()
  const updDebts = [...app.debts]
  updDebts[idx] = debt
  app.debts = updDebts
  if (totalChanged && debt.type === 'prosthetic' && debt.prostheticId) {
    const pIdx = app.prosthetics.findIndex(p => p.id === debt.prostheticId)
    if (pIdx >= 0) {
      const dp = doctorPct.value
      const newTotal = editTotal.value
      const lab = Number(debt.labValue || 0) || 0
      const net = newTotal - lab
      const updPros = [...app.prosthetics]
      updPros[pIdx] = {
        ...updPros[pIdx],
        total: newTotal, doctorShare: net * (dp / 100), clinicShare: net * ((100 - dp) / 100),
        name: debt.name, _mod: Date.now(),
      }
      app.prosthetics = updPros
    }
  }
  if (totalChanged && debt.type === 'regular' && debt.recordId) {
    const rIdx = app.records.findIndex(r => r.id === debt.recordId)
    if (rIdx >= 0) {
      const updRecs = [...app.records]
      updRecs[rIdx] = { ...updRecs[rIdx], amount: editTotal.value, name: debt.name, _mod: Date.now() }
      app.records = updRecs
      markMonthDirty(updRecs[rIdx].date)
    }
  }
  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم التحديث')
  closeEditModal()
}

function closeEditModal() { showEditModal.value = false }

function delDebt(id) {
  const debt = app.debts.find(d => d.id === id)
  if (!debt) return
  dblConfirm('حذف سجل الدين نهائياً؟', 'المريض: ' + (debt.name || '—') + '\nسيتم حذف الدين + السجل الأصلي + كل الدفعات نهائياً.', () => {
    const deletedIds = [id]
    const relatedPayments = app.records.filter(r => r.isDebtPayment && r.debtId === id)
    relatedPayments.forEach(r => {
      deletedIds.push(r.id)
      markMonthDirty(r.date)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: r.id, data: { id: r.id } }).catch(e => console.warn('[Delete] enqueue rec failed:', e))
    })
    app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === id))
    if (debt.prostheticId) {
      deletedIds.push(debt.prostheticId)
      markMonthDirty(debt.date)
      app.prosthetics = app.prosthetics.filter(p => p.id !== debt.prostheticId)
      enqueueSyncAction({ type: 'prosthetic_delete', table: 'prosthetics', recordId: debt.prostheticId, data: { id: debt.prostheticId } }).catch(e => console.warn('[Delete] enqueue pros failed:', e))
    }
    if (debt.recordId) {
      deletedIds.push(debt.recordId)
      markMonthDirty(debt.date)
      app.records = app.records.filter(r => r.id !== debt.recordId)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: debt.recordId, data: { id: debt.recordId } }).catch(e => console.warn('[Delete] enqueue rec failed:', e))
    }
    app.trackDeletionBatch(deletedIds)
    app.deleteDebt(id)
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false).then(() => {
      toast('تم حذف الدين والسجل الأصلي وكل الدفعات')
    }).catch(() => {
      toast('تم الحذف محلياً — سيتم المزامنة لاحقاً')
    })
  }, 'debts')
}

function forgiveDebt(id) {
  const debt = app.debts.find(d => d.id === id)
  if (!debt || debt.status === 'paid') return
  dblConfirm('مسامحة بالمبلغ المتبقي؟', 'المريض: ' + (debt.name || '—') + '\nالمتبقي: ' + (debt.remaining || 0) + '\nسيتم تعديل الإجمالي ليعكس المدفوع فعلياً.', () => {
    const dIdx = app.debts.findIndex(d => d.id === id)
    if (dIdx < 0) return
    const now_mod = Date.now()
    const paid = Number(debt.paidAmount) || 0
    const newTotal = paid
    const updDebts = [...app.debts]
    const updDebt = { ...updDebts[dIdx], totalAmount: newTotal, total: newTotal, remaining: 0, status: 'paid', _mod: now_mod }
    updDebts[dIdx] = updDebt
    app.debts = updDebts
    enqueueSyncAction({ type: 'debt_update', table: 'debts', recordId: id, data: { id, totalAmount: newTotal, total: newTotal, remaining: 0, status: 'paid', _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue debt:', e))
    if (debt.prostheticId) {
      const pIdx = app.prosthetics.findIndex(p => p.id === debt.prostheticId)
      if (pIdx >= 0) {
        const old = app.prosthetics[pIdx]
        const lab = Number(old.labValue || 0)
        const net = newTotal - lab
        const dp = app.config.doctorPct || 50
        const updPros = [...app.prosthetics]
        updPros[pIdx] = { ...old, total: newTotal, doctorShare: Math.max(0, net * (dp / 100)), clinicShare: Math.max(0, net * ((100 - dp) / 100)), _mod: now_mod }
        app.prosthetics = updPros
        markMonthDirty(old.date)
        enqueueSyncAction({ type: 'prosthetic_update', table: 'prosthetics', recordId: debt.prostheticId, data: { id: debt.prostheticId, total: newTotal, doctorShare: Math.max(0, net * (dp / 100)), clinicShare: Math.max(0, net * ((100 - dp) / 100)), _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue pros:', e))
      }
    }
    if (debt.recordId) {
      const rIdx = app.records.findIndex(r => r.id === debt.recordId)
      if (rIdx >= 0) {
        const updRecs = [...app.records]
        updRecs[rIdx] = { ...updRecs[rIdx], amount: newTotal, _mod: now_mod }
        app.records = updRecs
        markMonthDirty(updRecs[rIdx].date)
        enqueueSyncAction({ type: 'record_update', table: 'records', recordId: debt.recordId, data: { id: debt.recordId, amount: newTotal, _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue rec:', e))
      }
    }
    markDebtsDirty()
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false).then(() => {
      toast('تم مسامحة المريض — الإجمالي الآن: ' + n(newTotal) + ' ' + cur.value)
    }).catch(() => {
      toast('تم المسامحة محلياً — سيتم المزامنة لاحقاً')
    })
  }, 'debts')
}

const payPopupDebt = computed(() => app.debts.find(d => d.id === payPopupDebtId.value))
const payPct = computed(() => {
  const d = payPopupDebt.value
  if (!d) return 0
  const total = Number(d.totalAmount || d.total || 0) || 0
  return total > 0 ? Math.min(100, Math.round(((Number(d.paidAmount) || 0) / total) * 100)) : 0
})

function openPayPopup(id) { payPopupDebtId.value = id; showPayPopup.value = true; cancelConfirmIdx.value = -1 }
function closePayPopup() { showPayPopup.value = false; cancelConfirmIdx.value = -1 }

const cancelConfirmIdx = ref(-1)
let _cancelTimer = null
function cancelPayPopupInst(idx) {
  if (cancelConfirmIdx.value === idx) {
    clearTimeout(_cancelTimer)
    cancelConfirmIdx.value = -1
    doCancelPayPopupInst(idx)
  } else {
    cancelConfirmIdx.value = idx
    clearTimeout(_cancelTimer)
    _cancelTimer = setTimeout(() => { cancelConfirmIdx.value = -1 }, 3000)
  }
}
function doCancelPayPopupInst(idx) {
  const dIdx = app.debts.findIndex(d => d.id === payPopupDebtId.value)
  if (dIdx < 0) return
  const debtObj = { ...app.debts[dIdx] }
  if (!debtObj.installments || !debtObj.installments[idx]) return
  const inst = debtObj.installments[idx]
  const instAmt = Number(inst.amount || 0)
  const ip = debtObj.type === 'prosthetic'
  const dp = doctorPct.value

  debtObj.paidAmount = Math.max(0, (Number(debtObj.paidAmount) || 0) - instAmt)
  const totalDebtAmt = Number(debtObj.totalAmount || debtObj.total || 0) || 0
  debtObj.remaining = Math.max(0, totalDebtAmt - debtObj.paidAmount)

  if (debtObj.remaining <= 0.01) { debtObj.status = 'paid'; debtObj.remaining = 0 }
  else if (debtObj.paidAmount > 0.01) debtObj.status = 'partial'
  else debtObj.status = 'unpaid'

  if (ip) {
    const labVal = Number(debtObj.labValue || 0)
    debtObj.labPaid = Math.min(labVal, debtObj.paidAmount)
    const profitPortion = Math.max(0, debtObj.paidAmount - debtObj.labPaid)
    debtObj.doctorEarned = profitPortion * (dp / 100)
  }

  debtObj.installments = debtObj.installments.filter((_, j) => j !== idx)
  debtObj._mod = Date.now()

  const updDebts = [...app.debts]
  updDebts[dIdx] = debtObj
  app.debts = updDebts

  const matchRec = app.records.find(r =>
    r.isDebtPayment && r.debtId === debtObj.id &&
    (inst.recordId ? r.id === inst.recordId : r.date === inst.date)
  )
  if (matchRec) {
    markMonthDirty(matchRec.date)
    app.trackDeletion(matchRec.id)
    app.deleteRecord(matchRec.id)
    enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: matchRec.id, data: { id: matchRec.id } }).catch(() => {})
  }

  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم إلغاء الدفعة')
}

function goPatient(name) {
  const clinic = app.debts.find(d => d.name === name && d.clinic)?.clinic
    || app.records.find(r => r.name === name && r.clinic)?.clinic
    || app.prosthetics.find(p => p.name === name && p.clinic)?.clinic
    || ''
  if (clinic) {
    app.activeTab = 'clinics'
    router.push({ name: 'patient-profile', params: { clinic, patient: name } })
  } else {
    app.activeTab = 'clinics'
    router.push({ name: 'clinics', query: { search: name } })
  }
}

function editSourceRecord(id, type) {
  app.activeTab = 'home'
  router.push({ name: 'home', query: { edit: id, type } })
}
</script>
