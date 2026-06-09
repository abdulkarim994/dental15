<template>
  <div class="space-y-1">
    <!-- Today Summary Bar (compact) -->
    <div class="today-bar mb-0" style="padding:4px 0">
      <div class="today-cell">
        <div class="today-val">{{ todayPatients || '—' }}</div>
        <div class="today-lbl">مريض</div>
      </div>
      <div class="today-cell">
        <div class="today-val" :style="{ fontSize: 'calc(12px * var(--fs))' }">{{ todayIncome > 0 ? n(todayIncome) : '—' }}</div>
        <div class="today-lbl">دخل</div>
      </div>
      <div class="today-cell" v-if="pendingDebts > 0" @click="goTab('debts')" style="cursor:pointer">
        <div class="today-val" style="color:var(--red)">{{ n(pendingDebtTotal) }}</div>
        <div class="today-lbl" style="color:var(--red)">ديون ({{ pendingDebts }})</div>
      </div>
    </div>

    <div class="glass p-2.5 space-y-1.5">
      <div class="flex justify-between items-center">
        <h2 class="font-bold text-sm" style="color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          {{ editId ? 'تعديل القيد' : 'إدخال جديد' }}
        </h2>
        <div class="flex gap-1.5">
          <button @click="setToday" class="btn-o px-3 py-1 text-xs">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> اليوم
          </button>
          <button @click="toggleFastMode" class="btn-o px-2 py-1 text-xs" :class="{ 'qs-on': fastMode }" title="وضع الكشف السريع">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
          </button>
        </div>
      </div>

      <!-- 1. Date + 2. Patient Name (compact) -->
      <div>
        <label class="text-[10px] opacity-45 mb-0.5 block">التاريخ</label>
        <input type="date" v-model="form.date" class="inp text-xs" style="padding:4px 8px;min-height:30px">
      </div>

      <div>
        <label class="text-[10px] opacity-45 mb-0.5 block">اسم المريض</label>
        <input type="text" v-model="form.name" class="inp" placeholder="ابحث أو أدخل اسماً جديداً" autocomplete="off" @input="onNameInput">
        <div v-if="nameSuggestions.length" class="mt-1 p-1.5 rounded-xl space-y-0.5" style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.2)">
          <div v-for="s in nameSuggestions" :key="s.name" @click="selectPatientName(s)" class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-pointer transition-all" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)" @mouseenter="$event.target.style.borderColor='rgba(234,179,8,.4)'" @mouseleave="$event.target.style.borderColor='rgba(255,255,255,.08)'">
            <div class="min-w-0 flex-1">
              <span class="text-[11px] font-bold">{{ s.name }}</span>
              <span v-if="s.clinic" class="text-[9px] opacity-40 mr-1" style="color:var(--gold-l)">{{ s.clinic }}</span>
            </div>
            <span v-if="s.phone" class="text-[9px] opacity-50 direction-ltr flex-shrink-0">{{ s.phone }}</span>
          </div>
        </div>
      </div>

      <!-- 3. Clinic + 4. Treatment (2 cols) -->
      <div class="grid grid-cols-2 gap-2">
        <div v-if="!fastMode">
          <label class="text-[10px] opacity-45 mb-0.5 block">العيادة</label>
          <select v-model="form.clinic" class="inp text-xs">
            <option v-for="c in clinics" :key="c">{{ c }}</option>
          </select>
        </div>
        <div :class="{ 'col-span-2': fastMode }">
          <label class="text-[10px] opacity-45 mb-0.5 block">المعالجة</label>
          <select v-model="form.service" class="inp text-xs" @change="onSvcChange">
            <option v-for="s in services" :key="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <!-- 5. Payment + 6. Amount (2 cols) -->
      <div class="grid grid-cols-2 gap-2">
        <div v-if="!fastMode">
          <label class="text-[10px] opacity-45 mb-0.5 block">طريقة الدفع</label>
          <select v-model="form.payment" class="inp text-xs">
            <option v-for="p in payments" :key="p">{{ p }}</option>
          </select>
        </div>
        <div :class="{ 'col-span-2': fastMode }">
          <label class="text-[10px] opacity-45 mb-0.5 block">القيمة ({{ cur }})</label>
          <input type="number" v-model.number="form.amount" class="inp" placeholder="0" min="0" @input="calcPros">
        </div>
      </div>

      <!-- Phone (inline compact) -->
      <div>
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <label class="text-[10px] opacity-45 mb-0.5 block">رقم الهاتف</label>
            <input type="tel" v-model="form.phone" class="inp text-xs" placeholder="اختياري" dir="ltr" style="padding:4px 8px;min-height:30px">
          </div>
          <div v-if="showPhone2" class="flex-1">
            <div class="flex items-center gap-1 mb-0.5">
              <label class="text-[10px] opacity-45">رقم ثاني</label>
              <button type="button" @click="showPhone2 = false; form.phone2 = ''" class="text-[8px] opacity-40 px-1 rounded" style="background:rgba(255,68,85,.08);color:var(--red)">✕</button>
            </div>
            <input type="tel" v-model="form.phone2" class="inp text-xs" placeholder="اختياري" dir="ltr" style="padding:4px 8px;min-height:30px">
          </div>
          <button v-if="!showPhone2" type="button" @click="showPhone2 = true" class="text-[9px] opacity-40 px-1.5 py-0.5 rounded mt-3" style="background:rgba(59,130,246,.08);color:var(--blue)">+</button>
        </div>
      </div>

      <!-- Lab Row (prosthetics) -->
      <div v-if="isPros" class="glass-sm p-2.5 space-y-1.5">
        <label class="text-[10px] opacity-45 block">قيمة المعمل ({{ cur }})</label>
        <input type="number" v-model.number="form.labValue" class="inp" placeholder="0" min="0" @input="calcPros">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] opacity-45 block mb-0.5">إرسال للمعمل</label>
            <input type="date" v-model="form.labSentDate" class="inp text-xs">
          </div>
          <div>
            <label class="text-[10px] opacity-45 block mb-0.5">متوقع الاستلام</label>
            <input type="date" v-model="form.labExpectedDate" class="inp text-xs">
          </div>
        </div>
        <div>
          <label class="text-[10px] opacity-45 block mb-0.5">حالة المعمل</label>
          <div class="lab-status-grid">
            <button type="button" v-for="st in labStatuses" :key="st.value"
              class="lab-status-btn" :class="{ 'ls-active': form.labStatus === st.value, [st.cls]: true }"
              @click="form.labStatus = st.value">
              <span class="ls-icon" v-html="st.icon"></span>
              <span class="ls-label">{{ st.label }}</span>
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between text-xs"><span class="opacity-50">صافي الربح:</span><span class="n font-bold" style="color:var(--gold)">{{ n(prosNet) }}</span></div>
          <div class="flex justify-between text-xs"><span class="opacity-50">نسبة الطبيب ({{ doctorPct }}%):</span><span class="n font-bold text-green-400">{{ n(prosDocShare) }}</span></div>
          <div class="flex justify-between text-xs"><span class="opacity-50">نسبة العيادة ({{ 100 - doctorPct }}%):</span><span class="n font-bold text-blue-400">{{ n(prosClinShare) }}</span></div>
        </div>
      </div>

      <!-- Report + Debt Toggles (compact inline row) -->
      <div v-if="!fastMode" class="flex items-center gap-3 py-0.5">
        <div class="flex items-center gap-1.5 flex-1">
          <label class="tgl"><input type="checkbox" v-model="hasReport" @change="onReportTgl"><span class="tgl-s"></span></label>
          <span class="text-[11px] opacity-60">تقرير</span>
          <button v-if="hasReport" @click="showReportModal = true" class="btn-o px-2 py-0.5 text-[10px] mr-1">تحديد</button>
          <span v-if="hasReport && reportEntries.length" class="text-[9px] opacity-40">({{ reportEntries.length }})</span>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="tgl"><input type="checkbox" v-model="form.isDebt"><span class="tgl-s"></span></label>
          <span class="text-[11px] opacity-60">دين</span>
        </div>
        <button @click="goFollowUpAppt" class="btn-o px-2 py-0.5 text-[10px] flex items-center gap-1" title="موعد متابعة">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          موعد
        </button>
      </div>

      <!-- Report Modal Popup -->
      <ToothReport
        :visible="showReportModal"
        v-model="reportEntries"
        :reportMeta="reportMeta"
        :currency="cur"
        :formAmount="form.amount || 0"
        :patientName="form.name"
        :patientPhone="form.phone"
        @update:reportMeta="reportMeta = $event"
        @confirm="onReportConfirm"
        @close="showReportModal = false"
        @update-amount="form.amount = $event"
      />

      <!-- Debt Fields (only when debt toggled on) -->
      <div v-if="form.isDebt" class="glass-sm p-2.5 space-y-1.5">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] opacity-45 block mb-0.5">الدفعة الأولى</label>
            <input type="number" v-model.number="form.firstPay" class="inp text-xs" placeholder="0" min="0">
          </div>
          <div>
            <label class="text-[10px] opacity-45 block mb-0.5">ملاحظات</label>
            <input type="text" v-model="form.notes" class="inp text-xs" placeholder="ملاحظات (اختياري)">
          </div>
        </div>
      </div>

      <!-- Appointment (inline when active) -->
      <div v-if="showAppt && !fastMode" style="display:flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:.45"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        <span class="text-[10px] opacity-45 flex-shrink-0">متابعة:</span>
        <input type="date" v-model="form.appointment" class="inp flex-1 text-xs" style="padding:3px 6px;min-height:32px">
      </div>

      <!-- Save Button -->
      <button @click="saveRec" :disabled="saving" class="btn-g w-full py-2 text-sm shadow-lg">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ editId ? 'تحديث البيانات' : 'حفظ البيانات' }}
      </button>
      <button v-if="editId" @click="resetForm" class="w-full btn-del py-2 text-xs rounded-xl">✕ إلغاء التعديل</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, provide, onMounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePatientsStore } from '@/stores/patients.store'
import { useToast } from '@/composables/useToast'
import { formatNumber, isProsthetic, getCurrentDate } from '@/utils/format'
import { fuzzyMatch } from '@/utils/search'
import { markMonthDirty, markDebtsDirty } from '@/services/sync.service'
import { sum, isProsDebtPay, prosDocEarnings, n } from '@/utils/helpers'
import { generateId } from '@/utils/uid'
import ToothReport from './components/ToothReport.vue'

const router = useRouter()
const route = useRoute()
const app = useAppStore()
const auth = useAuthStore()
const patients = usePatientsStore()
const { toast } = useToast()

const saving = ref(false)
const fastMode = ref(false)
const showAppt = ref(false)
const editId = ref(null)
const editType = ref('')
const hasReport = ref(false)
const showReportModal = ref(false)
const reportEntries = ref([])
const reportMeta = ref({})

const reportTotal = computed(() => reportEntries.value.reduce((s, e) => s + (+e.cost || 0), 0))

function onReportConfirm() {
  hasReport.value = reportEntries.value.length > 0
  showReportModal.value = false
}

function onReportTgl() {
  if (hasReport.value) {
    showReportModal.value = true
  } else {
    reportEntries.value = []
    reportMeta.value = {}
  }
}

const showPhone2 = ref(false)
const form = ref({
  date: getCurrentDate(),
  amount: null,
  name: '',
  clinic: '',
  payment: '',
  service: '',
  isDebt: false,
  phone: '',
  phone2: '',
  notes: '',
  firstPay: null,
  labValue: null,
  labSentDate: '',
  labExpectedDate: '',
  labStatus: '',
  appointment: '',
})

// Handle ?name= or ?patient= from patients/clinics tabs, or ?edit= from records tab
function handleQueryName() {
  const q = route.query
  if (q.edit) {
    editRec(Number(q.edit) || q.edit, q.type || 'r')
    router.replace({ name: 'home', query: {} })
    return
  }
  const patName = q.name || q.patient
  if (patName) {
    form.value.name = patName
    // Fill phone from existing records (newest first)
    const allPatRecs = [...app.records, ...app.prosthetics, ...app.debts, ...app.appointments]
      .filter(r => r.name === patName)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const patPhone = allPatRecs.find(r => r.phone)?.phone || ''
    const patPhone2 = allPatRecs.find(r => r.phone2)?.phone2 || ''
    if (patPhone && !form.value.phone) form.value.phone = patPhone
    if (patPhone2) { form.value.phone2 = patPhone2; showPhone2.value = true }
    // Fill clinic from query or from patient's last record
    if (q.clinic && clinics.value.includes(q.clinic)) {
      form.value.clinic = q.clinic
    } else {
      const lastClinic = [...app.records, ...app.prosthetics]
        .filter(r => r.name === patName && r.clinic)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.clinic
      if (lastClinic && clinics.value.includes(lastClinic)) form.value.clinic = lastClinic
    }
    // Fill payment from patient's last record
    const lastPayment = [...app.records, ...app.prosthetics]
      .filter(r => r.name === patName && r.payment)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.payment
    if (lastPayment && payments.value.includes(lastPayment)) form.value.payment = lastPayment
    router.replace({ name: 'home', query: {} })
  }
}
onMounted(handleQueryName)
onActivated(handleQueryName)
onDeactivated(() => {
  form.value.date = getCurrentDate()
  form.value.clinic = clinics.value[0] || ''
  form.value.payment = payments.value[0] || ''
})

const cur = computed(() => app.currency)
const clinics = computed(() => app.clinics)
const services = computed(() => app.services)
const payments = computed(() => app.payments)
const doctorPct = computed(() => app.config.doctorPct || 50)
const svcPrices = computed(() => app.config.servicePrices || {})

// Set defaults when clinics/payments/services load
watch([clinics, payments, services], () => {
  if (!form.value.clinic && clinics.value.length) form.value.clinic = clinics.value[0]
  if (!form.value.payment && payments.value.length) form.value.payment = payments.value[0]
  if (!form.value.service && services.value.length) form.value.service = services.value[0]
}, { immediate: true })

const labStatuses = [
  { value: '', label: 'لم يُرسل بعد', cls: 'ls-none', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>' },
  { value: 'pending', label: 'قيد التنفيذ', cls: 'ls-pending', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
  { value: 'ready', label: 'جاهز للاستلام', cls: 'ls-ready', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>' },
  { value: 'delivered', label: 'تم الاستلام', cls: 'ls-delivered', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>' },
  { value: 'late', label: 'متأخر', cls: 'ls-late', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
]

const isPros = computed(() => isProsthetic(form.value.service))
const prosNet = computed(() => (form.value.amount || 0) - (form.value.labValue || 0))
const prosDocShare = computed(() => prosNet.value * (doctorPct.value / 100))
const prosClinShare = computed(() => prosNet.value * ((100 - doctorPct.value) / 100))

// Name suggestions with phone numbers
const nameSuggestions = ref([])
function onNameInput() {
  const q = (form.value.name || '').trim()
  if (q.length < 2) { nameSuggestions.value = []; return }
  const nameDataMap = new Map()
  ;[...app.records, ...app.prosthetics].forEach(r => {
    if (!r.name) return
    if (!nameDataMap.has(r.name)) {
      nameDataMap.set(r.name, { phone: r.phone || '', phone2: r.phone2 || '' })
    } else if (!nameDataMap.get(r.name).phone && r.phone) {
      nameDataMap.get(r.name).phone = r.phone
    }
  })
  app.debts.forEach(d => {
    if (d.name && d.phone && (!nameDataMap.get(d.name)?.phone)) {
      if (!nameDataMap.has(d.name)) nameDataMap.set(d.name, { phone: d.phone, phone2: d.phone2 || '' })
      else nameDataMap.get(d.name).phone = d.phone
    }
  })
  nameSuggestions.value = [...nameDataMap.entries()]
    .filter(([name]) => fuzzyMatch(q, name))
    .map(([name, data]) => {
      const rec = app.records.find(r => r.name === name && r.clinic)
      return { name, phone: data.phone, phone2: data.phone2, clinic: rec?.clinic || '' }
    })
    .slice(0, 8)
}

function selectPatientName(suggestion) {
  form.value.name = suggestion.name
  if (suggestion.phone && !form.value.phone) {
    form.value.phone = suggestion.phone
  }
  if (suggestion.phone2 && !form.value.phone2) {
    form.value.phone2 = suggestion.phone2
    showPhone2.value = true
  }
  if (suggestion.clinic && !form.value.clinic) {
    form.value.clinic = suggestion.clinic
  }
  nameSuggestions.value = []
  toast('تم الربط بسجل المريض: ' + suggestion.name)
}

function onSvcChange() {
  const p = svcPrices.value[form.value.service]
  if (p && !form.value.amount) form.value.amount = p
}

function quickPickSvc(svc) {
  form.value.service = svc
  const p = svcPrices.value[svc]
  if (p) form.value.amount = p
}

function calcPros() { /* reactivity handles it */ }

function setToday() {
  form.value.date = getCurrentDate()
  app.selectedMonth = new Date().toISOString().substring(0, 7)
}

function toggleFastMode() {
  fastMode.value = !fastMode.value
}

function goTab(id) {
  app.activeTab = id
  router.push({ name: id })
}

// Today summary
const todayPatients = computed(() => {
  const today = getCurrentDate()
  const names = new Set([
    ...app.records.filter(r => r.date === today).map(r => r.name),
    ...app.prosthetics.filter(p => p.date === today).map(p => p.name),
  ].filter(Boolean))
  return names.size
})

const todayIncome = computed(() => {
  const today = getCurrentDate()
  const debts = app.debts
  const tRec = app.records.filter(r => r.date === today && !r.isDebt && !r.isPros && !r.isDebtPayment && r.payment !== 'دين' && !isProsDebtPay(r, debts))
  const tPros = app.prosthetics.filter(p => p.date === today)
  const tPdP = app.records.filter(r => r.date === today && isProsDebtPay(r, debts))
  const tDebtPays = app.records.filter(r => r.date === today && r.isDebtPayment && !isProsDebtPay(r, debts))
  const { pDoc } = prosDocEarnings(tPros, tPdP)
  return sum(tRec, 'amount') + pDoc + sum(tDebtPays, 'amount')
})

const pendingDebts = computed(() => app.debts.filter(d => d.status !== 'paid').length)
const pendingDebtTotal = computed(() => app.debts.filter(d => d.status !== 'paid').reduce((s, d) => s + (Number(d.remaining) || 0), 0))

// Expose editRec for external calls
provide('editRec', editRec)

function editRec(id, type) {
  if (type === 'p') {
    const p = app.prosthetics.find(x => x.id === id)
    if (!p) return
    editId.value = p.id
    editType.value = 'p'
    form.value = {
      date: p.date, amount: p.total, name: p.name,
      clinic: p.clinic, service: services.value.find(s => isProsthetic(s)) || 'تركيبات',
      payment: p.payment === 'دين' ? (payments.value[0] || 'كاش') : p.payment,
      isDebt: !!p.isDebt, phone: '', notes: '',
      labValue: p.labValue || 0, labSentDate: p.labSentDate || '',
      labExpectedDate: p.labExpectedDate || '', labStatus: p.labStatus || '',
      firstPay: null, appointment: p.appointment || '',
    }
    form.value.phone = p.phone || ''
    form.value.phone2 = p.phone2 || ''
    if (p.phone2) showPhone2.value = true
    if (p.isDebt) {
      const d = app.debts.find(x => x.prostheticId === p.id)
      if (!form.value.phone && d?.phone) form.value.phone = d.phone
      if (!form.value.phone2 && d?.phone2) { form.value.phone2 = d.phone2; showPhone2.value = true }
      form.value.notes = d?.notes || ''
    }
    if (p.report && (Array.isArray(p.report) ? p.report.length : p.report.entries?.length)) {
      hasReport.value = true
      reportEntries.value = JSON.parse(JSON.stringify(Array.isArray(p.report) ? p.report : p.report.entries || []))
      reportMeta.value = p.report.meta ? { ...p.report.meta } : {}
    }
  } else {
    const r = app.records.find(x => x.id === id)
    if (!r) return
    editId.value = r.id
    editType.value = 'r'
    form.value = {
      date: r.date, amount: r.amount, name: r.name,
      clinic: r.clinic, service: r.service,
      payment: r.payment === 'دين' ? (payments.value[0] || 'كاش') : r.payment,
      isDebt: !!r.isDebt, phone: '', notes: '',
      labValue: null, labSentDate: '', labExpectedDate: '', labStatus: '',
      firstPay: null, appointment: r.appointment || '',
    }
    form.value.phone = r.phone || ''
    form.value.phone2 = r.phone2 || ''
    if (r.phone2) showPhone2.value = true
    if (r.isDebt) {
      const d = app.debts.find(x => x.recordId === r.id)
      if (!form.value.phone && d?.phone) form.value.phone = d.phone
      if (!form.value.phone2 && d?.phone2) { form.value.phone2 = d.phone2; showPhone2.value = true }
      form.value.notes = d?.notes || ''
    }
    if (r.report && (Array.isArray(r.report) ? r.report.length : r.report.entries?.length)) {
      hasReport.value = true
      reportEntries.value = JSON.parse(JSON.stringify(Array.isArray(r.report) ? r.report : r.report.entries || []))
      reportMeta.value = r.report.meta ? { ...r.report.meta } : {}
    }
  }
  if (form.value.appointment) showAppt.value = true
}

async function saveRec() {
  if (saving.value) return
  saving.value = true

  const { name, amount, date, clinic, service, payment, isDebt, phone, phone2, notes, appointment } = form.value
  if (!name?.trim()) { toast('يرجى إدخال اسم المريض'); saving.value = false; return }
  if (!date) { toast('يرجى اختيار التاريخ'); saving.value = false; return }
  if (isNaN(amount) || amount <= 0) { toast('يرجى إدخال قيمة صحيحة أكبر من صفر'); saving.value = false; return }
  if (!clinic) { toast('يرجى اختيار العيادة'); saving.value = false; return }
  if (!service) { toast('يرجى اختيار الخدمة'); saving.value = false; return }

  const uid = auth.uid
  const now_mod = Date.now()
  const ip = isProsthetic(service)

  const snapshot = {
    records: app.records,
    prosthetics: app.prosthetics,
    debts: app.debts,
  }

  try {
  const lab = ip ? (form.value.labValue || 0) : 0
  const net = amount - lab
  const dp = doctorPct.value
  const docShare = net * (dp / 100)
  const clinShare = net * ((100 - dp) / 100)

  if (editId.value) {
    const oldP = app.prosthetics.find(x => x.id === editId.value)
    const oldR = app.records.find(x => x.id === editId.value)
    const oldDate = oldP?.date || oldR?.date
    if (oldDate && oldDate.substring(0, 7) !== date.substring(0, 7)) markMonthDirty(oldDate)
  }

  if (ip) {
    const pid = editId.value || generateId()
    const pEntry = {
      id: pid, uid, date, name: name.trim(), total: amount, labValue: lab,
      doctorShare: docShare, clinicShare: clinShare,
      phone: phone || null, phone2: phone2 || null,
      payment: isDebt ? 'دين' : payment, clinic, isDebt, _mod: now_mod, _t: 'p',
      ...(form.value.labStatus ? { labStatus: form.value.labStatus } : {}),
      ...(form.value.labSentDate ? { labSentDate: form.value.labSentDate } : {}),
      ...(form.value.labExpectedDate ? { labExpectedDate: form.value.labExpectedDate } : {}),
      ...(appointment ? { appointment } : {}),
      report: hasReport.value && reportEntries.value.length > 0 ? { entries: JSON.parse(JSON.stringify(reportEntries.value)), meta: { ...reportMeta.value } } : null,
    }

    if (editId.value) {
      const idx = app.prosthetics.findIndex(x => x.id === pid)
      if (idx >= 0) {
        const updPros = [...app.prosthetics]
        updPros[idx] = pEntry
        app.prosthetics = updPros
      } else {
        app.prosthetics = [...app.prosthetics, pEntry]
      }
      const dIdx = app.debts.findIndex(d => d.prostheticId === pid)
      if (dIdx >= 0) {
        if (!isDebt) {
          app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === app.debts[dIdx].id))
          app.debts = app.debts.filter(d => d.prostheticId !== pid)
        } else {
          const oldPaid = Number(app.debts[dIdx].paidAmount) || 0
          const newRem = Math.max(0, amount - oldPaid)
          let newStatus
          if (newRem <= 0.01) newStatus = 'paid'
          else if (oldPaid > 0.01) newStatus = 'partial'
          else newStatus = 'unpaid'
          const updDebts = [...app.debts]
          updDebts[dIdx] = {
            ...updDebts[dIdx],
            total: amount, totalAmount: amount, labValue: lab, name: name.trim(), date, clinic,
            service, phone: phone || updDebts[dIdx].phone, notes: notes || updDebts[dIdx].notes,
            remaining: newRem <= 0.01 ? 0 : newRem, status: newStatus, _mod: now_mod,
          }
          app.debts = updDebts
        }
      } else if (isDebt) {
        app.debts = [...app.debts, {
          id: generateId(), uid, date, name: name.trim(), phone, phone2: phone2 || null, notes,
          type: 'prosthetic', status: 'unpaid',
          total: amount, totalAmount: amount, labValue: lab, labPaid: 0,
          paidAmount: 0, remaining: amount, doctorEarned: 0,
          payment, clinic, service, prostheticId: pid, installments: [], _mod: now_mod, _t: 'd',
        }]
      }
      cascadeNameChange(editId.value, name.trim(), date, clinic, now_mod)
    } else {
      app.prosthetics = [...app.prosthetics, pEntry]
      if (isDebt) {
        const firstPay = form.value.firstPay || 0
        const dId = generateId()
        const labRem = Math.max(0, lab)
        const toLab = Math.min(firstPay, labRem)
        const toProfit = firstPay - toLab
        const initPaid = Math.min(firstPay, amount)
        const initRem = Math.max(0, amount - initPaid)
        const isFull = initRem <= 0.01
        const newDebt = {
          id: dId, uid, date, name: name.trim(), phone, phone2: phone2 || null, notes,
          type: 'prosthetic', status: isFull ? 'paid' : (firstPay > 0 ? 'partial' : 'unpaid'),
          total: amount, totalAmount: amount, labValue: lab, labPaid: toLab,
          paidAmount: initPaid, remaining: initRem,
          doctorEarned: toProfit * (dp / 100), payment, clinic, service,
          prostheticId: pid, installments: [], _mod: now_mod, _t: 'd',
        }
        if (firstPay > 0) {
          const firstPayRecId = generateId()
          const dProfit = toProfit > 0 ? toProfit * (dp / 100) : 0
          newDebt.installments = [{ id: generateId(), amount: firstPay, date, payment, recordId: firstPayRecId }]
          app.records = [...app.records, {
            id: firstPayRecId, uid, date, name: name.trim(),
            amount: firstPay, _fullAmount: firstPay,
            _labAmount: toLab, _docAmount: dProfit,
            clinic, service: 'تركيبات (دفعة أولى)', payment,
            isDebt: false, isPros: false, isDebtPayment: true,
            debtId: dId, debtPaymentType: isFull ? 'full' : 'partial',
            _mod: now_mod, _t: 'r',
          }]
        }
        app.debts = [...app.debts, newDebt]
      }
    }
  } else {
    const rid = editId.value || generateId()
    const rEntry = {
      id: rid, uid, date, name: name.trim(), amount,
      clinic, service, payment: isDebt ? 'دين' : payment,
      isDebt, isPros: false,
      phone: phone || null, phone2: phone2 || null, notes: notes || null, _mod: now_mod, _t: 'r',
      ...(appointment ? { appointment } : {}),
      report: hasReport.value && reportEntries.value.length > 0 ? { entries: JSON.parse(JSON.stringify(reportEntries.value)), meta: { ...reportMeta.value } } : null,
    }

    if (editId.value) {
      const idx = app.records.findIndex(x => x.id === rid)
      if (idx >= 0) {
        const updRecs = [...app.records]
        updRecs[idx] = rEntry
        app.records = updRecs
      } else {
        app.records = [...app.records, rEntry]
      }
      const dIdx = app.debts.findIndex(d => d.recordId === rid)
      if (dIdx >= 0) {
        if (!isDebt) {
          app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === app.debts[dIdx].id))
          app.debts = app.debts.filter(d => d.recordId !== rid)
        } else {
          const oldPaid = Number(app.debts[dIdx].paidAmount) || 0
          const newRem = Math.max(0, amount - oldPaid)
          let newStatus
          if (newRem <= 0.01) newStatus = 'paid'
          else if (oldPaid > 0.01) newStatus = 'partial'
          else newStatus = 'unpaid'
          const updDebts = [...app.debts]
          updDebts[dIdx] = {
            ...updDebts[dIdx],
            totalAmount: amount, total: amount, name: name.trim(), date, clinic,
            service, phone: phone || updDebts[dIdx].phone, notes: notes || updDebts[dIdx].notes,
            remaining: newRem <= 0.01 ? 0 : newRem, status: newStatus, _mod: now_mod,
          }
          app.debts = updDebts
        }
      } else if (isDebt) {
        app.debts = [...app.debts, {
          id: generateId(), uid, date, name: name.trim(), phone, phone2: phone2 || null, notes,
          type: 'regular', status: 'unpaid',
          totalAmount: amount, total: amount, paidAmount: 0, remaining: amount,
          payment, clinic, service, recordId: rid, installments: [], _mod: now_mod, _t: 'd',
        }]
      }
      cascadeNameChange(editId.value, name.trim(), date, clinic, now_mod)
    } else {
      app.records = [...app.records, rEntry]
      if (isDebt) {
        const firstPay = form.value.firstPay || 0
        const dId = generateId()
        const initPaid = Math.min(firstPay, amount)
        const initRem = Math.max(0, amount - initPaid)
        const isFull = initRem <= 0.01
        const newDebt = {
          id: dId, uid, date, name: name.trim(), phone, phone2: phone2 || null, notes,
          type: 'regular', status: isFull ? 'paid' : (firstPay > 0 ? 'partial' : 'unpaid'),
          totalAmount: amount, paidAmount: initPaid, remaining: initRem,
          payment, clinic, service, recordId: rid, installments: [], _mod: now_mod, _t: 'd',
        }
        if (firstPay > 0) {
          const firstPayRecId = generateId()
          newDebt.installments = [{ id: generateId(), amount: firstPay, date, payment, recordId: firstPayRecId }]
          app.records = [...app.records, {
            id: firstPayRecId, uid, date, name: name.trim(),
            amount: firstPay, _fullAmount: firstPay, clinic,
            service: 'دفعة أولى (دين)', payment,
            isDebt: false, isPros: false, isDebtPayment: true,
            debtId: dId, debtPaymentType: isFull ? 'full' : 'partial',
            _mod: now_mod, _t: 'r',
          }]
        }
        app.debts = [...app.debts, newDebt]
      }
    }
  }

  markMonthDirty(date)
  markDebtsDirty()
  } catch (err) {
    app.records = snapshot.records
    app.prosthetics = snapshot.prosthetics
    app.debts = snapshot.debts
    toast('حدث خطأ أثناء الحفظ — يرجى المحاولة مرة أخرى')
    saving.value = false
    console.error('[AddRecord] saveRec rollback:', err)
    return
  }

  const savedRecord = ip
    ? { id: editId.value || now_mod, date, name: name.trim(), _mod: now_mod, _t: 'p' }
    : { id: editId.value || now_mod, date, name: name.trim(), amount, service, _mod: now_mod, _t: 'r' }
  patients.linkRecordToPatient(name.trim(), savedRecord)

  patients.invalidatePatientCache()
  app.saveToCache(uid)
  app.syncSave(uid, false)

  const wasEdit = !!editId.value
  const linkedDebt = app.debts.find(d => d.recordId === (savedRecord.id) || d.prostheticId === (savedRecord.id))
  let msg = ''
  if (wasEdit) {
    msg = ip ? 'تم تحديث التركيبة' : 'تم تحديث السجل'
    if (linkedDebt) msg += ' + تم تحديث الدين المرتبط'
  } else {
    msg = ip ? 'تم حفظ التركيبة' : 'تم حفظ السجل'
    if (isDebt) msg += ' + تم إنشاء دين جديد مرتبط'
  }
  if (phone) propagatePhone(name.trim(), phone, phone2 || null, now_mod)
  resetForm()
  toast(msg)
  saving.value = false
}

function cascadeNameChange(recordId, newName, newDate, newClinic, mod) {
  const debtIds = new Set()
  app.debts.forEach(d => {
    if (d.recordId === recordId || d.prostheticId === recordId) debtIds.add(d.id)
  })
  if (!debtIds.size) return
  let changed = false
  const updRecs = app.records.map(r => {
    if (r.isDebtPayment && debtIds.has(r.debtId) && r.name !== newName) {
      changed = true
      return { ...r, name: newName, _mod: mod }
    }
    return r
  })
  if (changed) app.records = updRecs
}

function propagatePhone(patName, newPhone, newPhone2, mod) {
  if (!patName || !newPhone) return
  let changed = false
  const updRecs = app.records.map(r => {
    if (r.name === patName && (r.phone !== newPhone || (newPhone2 && r.phone2 !== newPhone2))) {
      changed = true
      return { ...r, phone: newPhone, ...(newPhone2 ? { phone2: newPhone2 } : {}), _mod: mod }
    }
    return r
  })
  if (changed) app.records = updRecs
  let changedP = false
  const updPros = app.prosthetics.map(p => {
    if (p.name === patName && (p.phone !== newPhone || (newPhone2 && p.phone2 !== newPhone2))) {
      changedP = true
      return { ...p, phone: newPhone, ...(newPhone2 ? { phone2: newPhone2 } : {}), _mod: mod }
    }
    return p
  })
  if (changedP) app.prosthetics = updPros
  let changedD = false
  const updDebts = app.debts.map(d => {
    if (d.name === patName && (d.phone !== newPhone || (newPhone2 && d.phone2 !== newPhone2))) {
      changedD = true
      return { ...d, phone: newPhone, ...(newPhone2 ? { phone2: newPhone2 } : {}), _mod: mod }
    }
    return d
  })
  if (changedD) app.debts = updDebts
}

function goFollowUpAppt() {
  const name = (form.value.name || '').trim()
  const phone = (form.value.phone || '').trim()
  const svc = (form.value.service || '').trim()
  app.activeTab = 'calendar'
  router.push({ name: 'calendar', query: { followup: '1', name, phone, service: svc } })
}

function resetForm() {
  const keepDate = form.value.date || getCurrentDate()
  const keepClinic = form.value.clinic || clinics.value[0] || ''
  const keepPayment = form.value.payment || payments.value[0] || ''
  editId.value = null
  editType.value = ''
  showAppt.value = false
  showPhone2.value = false
  hasReport.value = false
  reportEntries.value = []
  reportMeta.value = {}
  form.value = {
    date: keepDate,
    amount: null, name: '', clinic: keepClinic,
    payment: keepPayment, service: services.value[0] || '',
    isDebt: false, phone: '', phone2: '', notes: '', firstPay: null,
    labValue: null, labSentDate: '', labExpectedDate: '', labStatus: '',
    appointment: '',
  }
  nameSuggestions.value = []
}
</script>
