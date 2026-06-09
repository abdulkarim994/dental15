<template>
  <div class="space-y-4">
    <!-- Search -->
    <div class="glass p-4 rounded-2xl">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            :value="searchQuery"
            type="text"
            class="inp"
            placeholder="بحث عن مريض..."
            style="padding-right:38px"
            @input="onSearch"
          >
          <svg
            class="absolute top-1/2 right-3 -translate-y-1/2 opacity-30"
            viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <!-- Filter toggle -->
        <button class="btn-o px-2.5 py-2" style="border-radius:12px" @click="showFilters = !showFilters" :class="{ 'rf-on': showFilters }">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </button>
        <span class="text-[10px] opacity-40 whitespace-nowrap">
          <span class="n">{{ totalPatients }}</span> مريض
        </span>
      </div>
      <!-- Filters Panel -->
      <div v-if="showFilters" class="mt-2 glass-sm p-3 rounded-xl space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] opacity-50 whitespace-nowrap">العيادة:</span>
          <select v-model="clinicFilter" class="inp text-xs flex-1" style="padding:4px 8px">
            <option value="">الكل</option>
            <option v-for="c in app.clinics" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
      <!-- Clinic Filter Badge -->
      <div v-if="clinicFilter" class="mt-2 flex items-center gap-2 p-2 rounded-xl" style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.2)">
        <span class="text-[10px] opacity-60">تصفية حسب العيادة:</span>
        <span class="text-xs font-bold" style="color:var(--gold)">{{ clinicFilter }}</span>
        <button @click="clinicFilter = ''" class="text-[10px] opacity-50 px-1.5 py-0.5 rounded" style="background:rgba(255,255,255,.1)">✕ إزالة</button>
      </div>
      <!-- Quick add-record button when search has results -->
      <div v-if="searchQuery && patients.length" class="mt-2">
        <button class="btn-g w-full py-2 text-xs font-bold" style="border-radius:12px" @click="addVisitForPatient(patients[0].name)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline;vertical-align:-2px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة سجل لـ {{ patients[0].name }}
        </button>
      </div>
      <!-- Server search button — always visible when searching -->
      <div v-if="searchQuery && !serverSearching" class="mt-2">
        <button class="btn-o w-full py-2 text-xs font-bold" style="border-radius:12px" @click="searchServer">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          بحث في السيرفر
        </button>
      </div>
      <div v-if="serverSearching" class="mt-2 flex items-center justify-center gap-2 text-xs opacity-50">
        <svg class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 010 20" stroke-linecap="round"/></svg>
        جار البحث في السيرفر...
      </div>
    </div>

    <!-- Patients list -->
    <SkeletonLoader v-if="isLoading" :count="3" variant="card" />
    <div v-else-if="!patients.length" class="text-center py-14 space-y-4">
      <p class="opacity-35 text-sm">{{ searchQuery ? 'لا توجد نتائج محلياً' : 'لا يوجد مرضى مسجلون بعد' }}</p>
    </div>

    <VirtualScroll
      v-if="patients.length"
      :items="patients"
      :itemHeight="280"
      :containerHeight="vsContainerHeight"
      :buffer="3"
    >
      <template #default="{ item }">
        <PatientCard
          :key="item.name"
          :patient="item"
          @add-visit="addVisitForPatient"
          @open-detail="togglePatDetail"
          @open-report="openPatientReport"
          @open-treatment="openTpModal"
          @print="printPatient"
          @edit="editPatientName"
          @delete="deletePatient"
          @settle-debt="settleDebt"
          @show-wa-templates="showWaTemplates"
          @open-xray="openXray"
          @go-records="goRecords"
        />
      </template>
    </VirtualScroll>

    <!-- Treatment Plan Modal -->
    <Teleport to="body">
      <div v-if="tpVisible" class="modal-ol" style="display:flex;align-items:flex-start;justify-content:center;padding-top:24px" @click.self="closeTpModal">
        <div class="glass p-5 w-full max-w-sm mx-3 space-y-4 rounded-2xl max-h-[90vh] overflow-y-auto" @click.stop>
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm" style="color:var(--gold)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              خطة العلاج
            </h3>
            <button @click="closeTpModal" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
          </div>
          <p class="text-[10px] opacity-50">المريض: {{ tpName }}</p>

          <!-- Stages list -->
          <div v-if="!tpStages.length" class="text-xs opacity-40 text-center py-4">لا توجد مراحل — أضف مرحلة أدناه</div>
          <div v-else class="space-y-2">
            <div v-for="(s, i) in tpStages" :key="s.id" class="tp-stage" :class="{ done: s.done }">
              <div class="tp-check" :class="{ checked: s.done }" @click="tpToggleStage(i)">{{ s.done ? '✓' : '' }}</div>
              <div class="flex-1 min-w-0">
                <p class="tp-desc text-xs font-bold">{{ s.desc }}</p>
                <p v-if="s.doneDate" class="text-[9px] opacity-40">أُنجز: {{ s.doneDate }}</p>
              </div>
              <button @click="tpRemoveStage(i)" class="text-[10px] px-1.5 py-0.5 rounded" style="color:var(--red);opacity:.6">✕</button>
            </div>
          </div>

          <!-- Add new stage -->
          <div class="flex gap-2">
            <input type="text" v-model="tpNewStage" class="inp flex-1 text-xs" placeholder="وصف المرحلة الجديدة..." @keyup.enter="tpAddStage">
            <button @click="tpAddStage" class="btn-g px-3 py-1.5 text-xs">+ إضافة</button>
          </div>

          <!-- Save/Cancel -->
          <div class="flex gap-2 pt-2 border-t border-white/10">
            <button @click="closeTpModal" class="btn-o flex-1 py-2 text-xs">إلغاء</button>
            <button @click="saveTpModal" class="btn-g flex-1 py-2 text-xs">حفظ الخطة</button>
          </div>
        </div>
      </div>
    </Teleport>

    <DoubleConfirm :visible="dcVisible" :title="dcTitle" :msg="dcMsg" :duration="dcDuration" @confirm="onDcConfirm" @cancel="onDcCancel" />

    <!-- Patient Print Overlay -->
    <PrintOverlay
      :visible="printVisible"
      :title="printTitle"
      :html="printHtml"
      @close="printVisible = false"
    />

    <!-- Debt Pay Popup -->
    <DebtPayPopup
      :visible="debtPayVisible"
      :debtId="debtPayTarget"
      @close="debtPayVisible = false"
      @updated="onDebtPaid"
    />

    <!-- X-Ray Viewer -->
    <XrayViewer
      :visible="xrayVisible"
      :images="xrayImages"
      :patientName="xrayPatName"
      :startIndex="xrayStartIdx"
      @close="xrayVisible = false"
      @delete="onXrayDelete"
    />

    <!-- Edit Patient Modal -->
    <Teleport to="body">
      <div v-if="editModalVisible" class="modal-ol" style="display:flex;align-items:center;justify-content:center;padding:16px" @click.self="editModalVisible = false">
        <div class="glass p-5 w-full max-w-sm rounded-2xl space-y-4" @click.stop>
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm" style="color:var(--gold)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              تعديل بيانات المريض
            </h3>
            <button @click="editModalVisible = false" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">اسم المريض</label>
            <input type="text" v-model="editForm.name" class="inp text-xs w-full">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">رقم الهاتف</label>
            <input type="tel" v-model="editForm.phone" class="inp text-xs w-full" placeholder="رقم الهاتف" dir="ltr">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">العيادة</label>
            <select v-model="editForm.clinic" class="inp text-xs w-full">
              <option v-for="c in clinicsList" :key="c">{{ c }}</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button @click="saveEditPatient" class="btn-g flex-1 py-2.5 text-xs font-bold">حفظ التغييرات</button>
            <button @click="editModalVisible = false" class="btn-o px-4 py-2.5 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- WhatsApp Templates Overlay -->
    <Teleport to="body">
      <div v-if="waTplVisible" class="modal-ol" style="display:flex;align-items:flex-end;justify-content:center;padding:0 16px 32px" @click.self="waTplVisible = false">
        <div class="w-full max-w-md glass p-4 rounded-t-3xl rounded-b-2xl space-y-2.5" @click.stop>
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm" style="color:var(--gold)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              قوالب رسائل — {{ waTplName }}
            </span>
            <button @click="waTplVisible = false" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
          </div>
          <a v-for="(t, i) in waTplList" :key="i" :href="t.link" target="_blank" rel="noopener" @click="waTplVisible = false"
            class="flex items-center gap-3 p-3 rounded-2xl text-right" style="background:rgba(37,211,102,.07);border:1px solid rgba(37,211,102,.18);text-decoration:none;cursor:pointer">
            <span style="font-size:22px;flex-shrink:0">💬</span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-bold" style="color:var(--gold-l)">{{ t.lbl }}</p>
              <p class="text-[9px] opacity-45 truncate">{{ t.preview }}</p>
            </div>
          </a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onActivated, onDeactivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePatientsStore } from '@/stores/patients.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import { useDoubleConfirm } from '@/composables/useDoubleConfirm'
import { debounce } from '@/utils/debounce'
import { formatNumber } from '@/utils/format'
import { markMonthDirty, markDebtsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import { useAuthStore } from '@/stores/auth.store'
import PatientCard from './components/PatientCard.vue'
import VirtualScroll from '@/components/VirtualScroll.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { deleteXrayImage } from '@/services/image.service'
import { generateId } from '@/utils/uid'

const PrintOverlay = defineAsyncComponent(() => import('@/components/PrintOverlay.vue'))
const DebtPayPopup = defineAsyncComponent(() => import('@/components/DebtPayPopup.vue'))
const DoubleConfirm = defineAsyncComponent(() => import('@/components/DoubleConfirm.vue'))
const XrayViewer = defineAsyncComponent(() => import('@/components/XrayViewer.vue'))

const vsContainerHeight = Math.max(400, window.innerHeight - 200)
const isLoading = computed(() => app.syncing)

const patientsStore = usePatientsStore()
const app = useAppStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function handleSearchQuery() {
  const q = route.query
  if (q.search) {
    patientsStore.setSearch(q.search)
    router.replace({ name: 'clinics', query: {} })
  }
}
onMounted(handleSearchQuery)
onActivated(handleSearchQuery)
onDeactivated(() => { patientsStore.setSearch('') })
const { toast } = useToast()
const { dcVisible, dcTitle, dcMsg, dcDuration, dblConfirm, onDcConfirm, onDcCancel } = useDoubleConfirm()

const searchQuery = computed(() => patientsStore.searchQuery)
const patientsRaw = computed(() => patientsStore.filteredPatients)
const patients = computed(() => {
  const cf = clinicFilter.value
  if (!cf) return patientsRaw.value
  return patientsRaw.value.filter(p => p.entries?.some(e => e.clinic === cf))
})
const totalPatients = computed(() => patientsStore.totalPatients)
const n = formatNumber

const serverSearching = ref(false)
const showFilters = ref(false)
const clinicFilter = ref('')

const onSearch = debounce((e) => {
  patientsStore.setSearch(e.target.value)
}, 250)

async function searchServer() {
  if (navigator.onLine === false) {
    toast('لا يوجد اتصال بالإنترنت')
    return
  }
  serverSearching.value = true
  try {
    const ok = await app.searchFromServer(auth.uid, searchQuery.value)
    if (!ok) {
      toast('فشل البحث في السيرفر')
    } else if (!patientsStore.filteredPatients.length) {
      toast('لم يتم العثور على المريض')
    }
  } catch {
    toast('خطأ في البحث')
  } finally {
    serverSearching.value = false
  }
}

/* ── 1. ADD VISIT — navigate to Add tab with name pre-filled ── */
function addVisitForPatient(name) {
  app.activeTab = 'home'
  router.push({ name: 'home', query: { name } })
}

function goRecords(name) {
  app.activeTab = 'clinics'
  router.push({ name: 'clinics', query: { search: name } })
}

/* ── 2. TOGGLE DETAIL ── */
function togglePatDetail(name) {
  patientsStore.selectPatient(name)
}

/* ── 3. OPEN PATIENT REPORT (file) — print full patient report ── */
function openPatientReport(name) {
  printPatient(name)
}

/* ── 4. TREATMENT PLAN MODAL ── */
const tpVisible = ref(false)
const tpName = ref('')
const tpStages = ref([])
const tpNewStage = ref('')

function openTpModal(name) {
  tpName.value = name
  tpStages.value = JSON.parse(JSON.stringify(
    (app.config.treatmentPlans && app.config.treatmentPlans[name]) || []
  ))
  tpNewStage.value = ''
  tpVisible.value = true
}

function closeTpModal() {
  tpVisible.value = false
}

function tpToggleStage(i) {
  tpStages.value[i].done = !tpStages.value[i].done
  tpStages.value[i].doneDate = tpStages.value[i].done
    ? new Date().toISOString().substring(0, 10) : ''
}

function tpRemoveStage(i) {
  tpStages.value.splice(i, 1)
}

function tpAddStage() {
  const v = (tpNewStage.value || '').trim()
  if (!v) { toast('أدخل وصف المرحلة'); return }
  tpStages.value.push({ id: generateId(), desc: v, done: false, doneDate: '' })
  tpNewStage.value = ''
}

function saveTpModal() {
  if (!app.config.treatmentPlans) app.config.treatmentPlans = {}
  app.config.treatmentPlans[tpName.value] = tpStages.value
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حفظ خطة العلاج')
  closeTpModal()
}

/* ── 5. PRINT PATIENT FULL ── */
const printVisible = ref(false)
const printTitle = ref('')
const printHtml = ref('')

function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function printPatient(name) {
  const patMap = patientsStore.patientMap
  const p = patMap[name]
  if (!p) { toast('لا توجد بيانات لهذا المريض'); return }
  const patDebts = app.debts.filter(d => d.name === name)
  const totalDebtRem = patDebts.reduce((s, d) => s + (Number(d.remaining) || 0), 0)
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const cur = _esc(app.currency)

  const dp = app.config.doctorPct || 50
  const dpR = app.config.doctorPctRegular || dp
  const serviceEntries = [...p.entries].filter(r => !r.isDebtPayment).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const paymentEntries = [...p.entries].filter(r => r.isDebtPayment).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const patPhone = _esc(patDebts.find(d => d.phone)?.phone || p.entries.find(r => r.phone)?.phone || '')

  let idx = 0
  let totalDocShare = 0
  let totalClinShare = 0
  let totalLabValue = 0
  let prosDocShare = 0
  let prosClinShare = 0
  let regDocShare = 0
  let regClinShare = 0
  const svcRows = serviceEntries.map(r => {
    idx++
    const isPros = r._t === 'p' || r._s === 'p'
    const amt = Number(r.amount || r.total || 0) || 0
    const hasRep = r.report && (Array.isArray(r.report) ? r.report.length > 0 : (r.report.entries?.length || 0) > 0)
    const repEntries = hasRep ? (Array.isArray(r.report) ? r.report : (r.report.entries || [])) : []
    const debtCol = r.isDebt ? `<strong>${n(amt)}</strong>` : '—'
    let paidCol
    if (r.isDebt) {
      const dbt = isPros
        ? app.debts.find(d => d.prostheticId === r.id)
        : app.debts.find(d => d.recordId === r.id)
      const paid = Number(dbt?.paidAmount || 0) || 0
      paidCol = paid > 0 ? `<strong>${n(paid)}</strong>` : '—'
    } else {
      paidCol = `<strong>${n(amt)}</strong>`
    }
    let repDetail = ''
    if (repEntries.length) {
      repDetail = `<div style="margin-top:3px;font-size:8px;color:#555">`
      repDetail += repEntries.map(e => `<span style="display:inline-block;margin:1px 2px;border:1px solid #ccc;border-radius:3px;padding:0 4px;font-weight:600">${_esc(e.service)}${e.teeth?.length ? ' (' + e.teeth.map(t => _esc(t.n)).join(',') + ')' : ''}</span>`).join('')
      repDetail += `</div>`
    }
    const payType = r.isDebt ? 'دين' : _esc(r.payment || 'كاش')
    const svcLabel = _esc(r.service) || (isPros ? 'تركيبة' : 'علاج')

    let labVal = 0, docShare = 0, clinShare = 0
    if (isPros) {
      labVal = Number(r.labValue || 0) || 0
      docShare = Number(r.doctorShare || 0) || 0
      clinShare = Number(r.clinicShare || 0) || 0
    } else {
      docShare = Math.round(amt * dpR / 100 * 100) / 100
      clinShare = Math.round(amt * (100 - dpR) / 100 * 100) / 100
    }
    totalDocShare += docShare
    totalClinShare += clinShare
    totalLabValue += labVal
    if (isPros) { prosDocShare += docShare; prosClinShare += clinShare }
    else { regDocShare += docShare; regClinShare += clinShare }

    let detailLine = `<div style="margin-top:2px;font-size:8px;color:#666">`
    const pctLabel = isPros ? dp : dpR
    if (isPros && labVal > 0) detailLine += `<span style="margin-left:8px">معمل: ${n(labVal)}</span>`
    detailLine += `<span style="margin-left:8px">طبيب (${pctLabel}%): ${n(docShare)}</span>`
    detailLine += `<span style="margin-left:8px">عيادة (${100 - pctLabel}%): ${n(clinShare)}</span>`
    detailLine += `</div>`

    return `<tr>
      <td style="text-align:center">${idx}</td>
      <td>${_esc(r.date) || '—'}</td>
      <td style="font-weight:700">${svcLabel}${isPros ? ' (تركيبة)' : ''}${repDetail}${detailLine}</td>
      <td style="text-align:center">${payType}</td>
      <td style="text-align:center">${paidCol}</td>
      <td style="text-align:center">${debtCol}</td>
    </tr>`
  }).join('')

  const payRows = paymentEntries.map(r => {
    idx++
    const amt = Number(r.amount || 0) || 0
    const payType = _esc(r.payment || 'كاش')
    return `<tr>
      <td style="text-align:center">${idx}</td>
      <td>${_esc(r.date) || '—'}</td>
      <td style="font-weight:600">${_esc(r.service) || 'دفعة دين'}</td>
      <td style="text-align:center">${payType}</td>
      <td style="text-align:center"><strong>${n(amt)}</strong></td>
      <td style="text-align:center">—</td>
    </tr>`
  }).join('')

  printTitle.value = `ملف المريض — ${name}`
  printHtml.value = `
<div class="sec-title"><div class="sec-dot"></div>بيانات المريض</div>
<div class="info-grid">
  <div class="info-cell" style="grid-column:span 2"><div class="lbl">الاسم الكامل</div><div class="val">${_esc(name)}</div></div>
  <div class="info-cell"><div class="lbl">رقم الجوال</div><div class="val">${patPhone || '—'}</div></div>
</div>
<div class="info-grid" style="margin-bottom:0">
  <div class="info-cell"><div class="lbl">عدد الزيارات</div><div class="val">${p.visitCount} زيارة</div></div>
  <div class="info-cell"><div class="lbl">العملة</div><div class="val">${cur}</div></div>
  <div class="info-cell"><div class="lbl">تاريخ التقرير</div><div class="val">${today}</div></div>
</div>
<div class="sec-title" style="margin-top:1px"><div class="sec-dot"></div>سجل الخدمات والمدفوعات</div>
<table>
  <thead><tr>
    <th style="width:30px;text-align:center">#</th>
    <th style="width:75px">التاريخ</th>
    <th>الخدمة / الإجراء</th>
    <th style="width:55px;text-align:center">الدفع</th>
    <th style="width:75px;text-align:center">المدفوع</th>
    <th style="width:75px;text-align:center">الدين</th>
  </tr></thead>
  <tbody>${svcRows}${payRows}</tbody>
</table>
<div class="summary-grid">
  <div class="sum-card"><div class="lbl">إجمالي الخدمات</div><div class="val">${n(p.grossTotal)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"><div class="lbl">المدفوع فعلياً</div><div class="val">${n(p.total)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"><div class="lbl">الرصيد المتبقي</div><div class="val">${totalDebtRem > 0 ? n(totalDebtRem) : '0'}</div><div class="unit">${cur}</div></div>
</div>
${prosDocShare > 0 ? `<div class="summary-grid">
  <div class="sum-card"><div class="lbl">طبيب — تركيبات (${dp}%)</div><div class="val">${n(prosDocShare)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"><div class="lbl">عيادة — تركيبات (${100 - dp}%)</div><div class="val">${n(prosClinShare)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"><div class="lbl">تكلفة المعامل</div><div class="val">${n(totalLabValue)}</div><div class="unit">${cur}</div></div>
</div>` : ''}
${regDocShare > 0 ? `<div class="summary-grid">
  <div class="sum-card"><div class="lbl">طبيب — معالجات (${dpR}%)</div><div class="val">${n(regDocShare)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"><div class="lbl">عيادة — معالجات (${100 - dpR}%)</div><div class="val">${n(regClinShare)}</div><div class="unit">${cur}</div></div>
  ${prosDocShare <= 0 && totalLabValue <= 0 ? `<div class="sum-card"><div class="lbl">المعامل</div><div class="val">—</div><div class="unit">لا توجد تركيبات</div></div>` : '<div class="sum-card"></div>'}
</div>` : ''}
${(prosDocShare > 0 && regDocShare > 0) ? `<div class="summary-grid">
  <div class="sum-card" style="border:2px solid rgba(234,179,8,.3)"><div class="lbl">إجمالي نسبة الطبيب</div><div class="val">${n(totalDocShare)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card" style="border:2px solid rgba(234,179,8,.3)"><div class="lbl">إجمالي نسبة العيادة</div><div class="val">${n(totalClinShare)}</div><div class="unit">${cur}</div></div>
  <div class="sum-card"></div>
</div>` : ''}
${totalDebtRem > 0 ? `<div class="debt-footer">
  <span class="lbl">رصيد دين مستحق على المريض</span>
  <span class="val">${n(totalDebtRem)} ${cur}</span>
</div>` : ''}
<div class="sig-row">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">توقيع الطبيب</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">توقيع المريض</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">ختم المركز</div></div>
</div>`
  printVisible.value = true
}

/* ── 6. EDIT PATIENT — modal with name + phone + clinic ── */
const editModalVisible = ref(false)
const editForm = ref({ name: '', phone: '', clinic: '', _originalName: '' })
const clinicsList = computed(() => app.clinics || [])

function editPatientName(oldName) {
  const phone = patientsStore.getPatientPhone(oldName)
  const firstRec = app.records.find(r => r.name === oldName)
  const clinic = firstRec?.clinic || (clinicsList.value[0] || '')
  editForm.value = { name: oldName, phone, clinic, _originalName: oldName }
  editModalVisible.value = true
}

function saveEditPatient() {
  const oldName = editForm.value._originalName
  const newName = (editForm.value.name || '').trim()
  const newPhone = (editForm.value.phone || '').trim()
  const newClinic = editForm.value.clinic
  if (!newName) { toast('يرجى إدخال اسم المريض'); return }

  const nameChanged = newName !== oldName
  const now = Date.now()

  app.records.forEach(r => {
    if (r.name !== oldName) return
    if (nameChanged) r.name = newName
    if (newPhone) r.phone = newPhone
    if (newClinic) r.clinic = newClinic
    r._mod = now
  })
  app.prosthetics.forEach(p => {
    if (p.name !== oldName) return
    if (nameChanged) p.name = newName
    if (newPhone) p.phone = newPhone
    if (newClinic) p.clinic = newClinic
    p._mod = now
  })
  app.debts.forEach(d => {
    if (d.name !== oldName) return
    if (nameChanged) d.name = newName
    if (newPhone) d.phone = newPhone
    d._mod = now
  })
  ;(app.appointments || []).forEach(a => {
    if (a.name !== oldName) return
    if (nameChanged) a.name = newName
    if (newPhone) a.phone = newPhone
  })

  if (nameChanged && app.config.treatmentPlans && app.config.treatmentPlans[oldName]) {
    app.config.treatmentPlans[newName] = app.config.treatmentPlans[oldName]
    delete app.config.treatmentPlans[oldName]
  }

  markDebtsDirty()
  patientsStore.invalidatePatientCache()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  editModalVisible.value = false
  toast('تم تحديث بيانات المريض بنجاح')
}

/* ── 7. DELETE PATIENT — with double-confirmation ── */
function deletePatient(name) {
  const patRecs = app.records.filter(r => r.name === name)
  const patPros = app.prosthetics.filter(p => p.name === name)
  const patDebts = app.debts.filter(d => d.name === name)
  const totalEntries = patRecs.length + patPros.length
  const msg = `سيتم حذف:\n• ${patRecs.length} سجل علاج\n• ${patPros.length} سجل تركيبات\n• ${patDebts.length} سجل ديون\nإجمالي السجلات: ${totalEntries}`

  dblConfirm('حذف جميع بيانات المريض "' + name + '"؟', msg, () => {
    const deletedIds = [
      ...patRecs.map(r => r.id),
      ...patPros.map(p => p.id),
      ...patDebts.map(d => d.id),
    ].filter(Boolean)
    app.trackDeletionBatch(deletedIds)
    patRecs.forEach(r => {
      markMonthDirty(r.date)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: r.id, data: { id: r.id } }).catch(e => console.warn('[Delete] enqueue rec failed:', e))
    })
    patPros.forEach(p => {
      markMonthDirty(p.date)
      enqueueSyncAction({ type: 'prosthetic_delete', table: 'prosthetics', recordId: p.id, data: { id: p.id } }).catch(e => console.warn('[Delete] enqueue pros failed:', e))
    })
    patDebts.forEach(d => {
      enqueueSyncAction({ type: 'debt_delete', table: 'debts', recordId: d.id, data: { id: d.id } }).catch(e => console.warn('[Delete] enqueue debt failed:', e))
    })
    app.records = app.records.filter(r => r.name !== name)
    app.prosthetics = app.prosthetics.filter(p => p.name !== name)
    app.debts = app.debts.filter(d => d.name !== name)
    if (app.config.treatmentPlans && app.config.treatmentPlans[name]) delete app.config.treatmentPlans[name]
    markDebtsDirty()
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false)
    toast('تم حذف جميع بيانات المريض: ' + name)
  }, 'pat')
}

/* ── 8. SETTLE DEBT — open first active debt for payment ── */
const debtPayVisible = ref(false)
const debtPayTarget = ref(null)

function settleDebt(name) {
  const activeDebts = app.debts.filter(d => d.name === name && d.status !== 'paid')
  if (!activeDebts.length) { toast('لا توجد ديون نشطة لهذا المريض'); return }
  debtPayTarget.value = activeDebts[0].id
  debtPayVisible.value = true
}

function onDebtPaid() {
  debtPayVisible.value = false
  debtPayTarget.value = null
}

/* ── 9. X-RAY VIEWER ── */
const xrayVisible = ref(false)
const xrayImages = ref([])
const xrayPatName = ref('')
const xrayStartIdx = ref(0)

function openXray(name, idx = 0) {
  const imgs = (app.config.patientXrays && app.config.patientXrays[name]) || []
  if (!imgs.length) { toast('لا توجد صور أشعة لهذا المريض'); return }
  xrayImages.value = imgs
  xrayPatName.value = name
  xrayStartIdx.value = idx
  xrayVisible.value = true
}

async function onXrayDelete(idx) {
  const name = xrayPatName.value
  const imgs = (app.config.patientXrays && app.config.patientXrays[name]) || []
  if (idx < 0 || idx >= imgs.length) return
  const img = imgs[idx]
  const key = typeof img === 'string' ? img : img.key
  if (key) {
    try { await deleteXrayImage(key) } catch {}
  }
  imgs.splice(idx, 1)
  app.updateConfig({ patientXrays: { ...app.config.patientXrays, [name]: [...imgs] } })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  xrayImages.value = [...imgs]
  toast('تم حذف صورة الأشعة')
  if (!imgs.length) xrayVisible.value = false
}

/* ── 10. WHATSAPP TEMPLATES OVERLAY ── */
const waTplVisible = ref(false)
const waTplName = ref('')
const waTplList = ref([])

function showWaTemplates(name, phone) {
  const ph = (phone + '').replace(/[^0-9+]/g, '')
  if (!ph) { toast('لا يوجد رقم هاتف لهذا المريض'); return }
  const center = app.config.centerName || 'العيادة'
  const tplBase = app.config.waTemplates && app.config.waTemplates.length ? app.config.waTemplates : [
    { lbl: 'تذكير بموعد', msg: 'السلام عليكم {name}\nنذكركم بموعدكم في {center}.\nنرجو التأكيد أو التواصل معنا' },
    { lbl: 'تذكير بدين', msg: 'السلام عليكم {name}\nنود تذكيركم بوجود مبلغ مستحق في {center}.\nنشكر تعاونكم' },
    { lbl: 'متابعة العلاج', msg: 'السلام عليكم {name}\nنتمنى أن تكونوا بصحة وعافية.\nكيف حال الأسنان بعد آخر زيارة؟' },
    { lbl: 'عرض خاص', msg: 'السلام عليكم {name}\nيسعدنا إعلامكم عن عرض خاص في {center}.\nتواصلوا معنا لمزيد من التفاصيل' },
  ]
  waTplList.value = tplBase.map(t => {
    const msg = (t.msg || '').replace(/\{name\}/g, name).replace(/\{center\}/g, center)
    return { lbl: t.lbl, preview: msg.replace(/\n/g, ' '), link: `https://wa.me/${ph}?text=${encodeURIComponent(msg)}` }
  })
  waTplName.value = name
  waTplVisible.value = true
}
</script>
