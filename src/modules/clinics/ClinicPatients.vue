<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <button @click="goBack" class="btn-o px-3 py-1.5 text-xs">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:scaleX(-1)"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-black truncate" style="color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;color:var(--gold)"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/></svg>
          {{ clinicName }}
        </h2>
        <p class="text-[9px] opacity-35">{{ patients.length }} مريض</p>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <input
        type="text"
        v-model="searchQuery"
        class="inp"
        placeholder="بحث عن مريض..."
        style="padding-right:38px"
      >
      <svg
        class="absolute top-1/2 right-3 -translate-y-1/2 opacity-30"
        viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    </div>

    <!-- Sort -->
    <div class="rec-filter-bar">
      <button class="rec-filter-btn" :class="{ 'rf-on': sortBy === 'recent' }" @click="sortBy = 'recent'">الأحدث</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': sortBy === 'name' }" @click="sortBy = 'name'">الاسم</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': sortBy === 'amount' }" @click="sortBy = 'amount'">المبلغ</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': sortBy === 'date' }" @click="sortBy = 'date'">التاريخ</button>
      <button class="rec-filter-btn" :class="{ 'rf-on': sortBy === 'modified' }" @click="sortBy = 'modified'">التعديل</button>
    </div>

    <!-- Patients List -->
    <SkeletonLoader v-if="app.syncing" :count="4" variant="row" />
    <div v-else-if="!filteredPatients.length" class="text-center py-16 opacity-25">
      <svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;display:block;color:var(--gold)"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
      <p class="text-sm font-bold mt-3">{{ searchQuery ? 'لا توجد نتائج' : 'لا يوجد مرضى في هذه العيادة' }}</p>
    </div>

    <VirtualScroll
      v-if="filteredPatients.length"
      :items="filteredPatients"
      :itemHeight="90"
      :containerHeight="vsContainerHeight"
      :buffer="5"
    >
      <template #default="{ item }">
        <div
          :key="item.name"
          class="cp-row glass-sm"
          @click="openPatient(item)"
        >
          <div class="cp-row-main">
            <div class="cp-avatar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="cp-info">
              <div class="flex items-center gap-1.5 flex-wrap">
                <p class="text-xs font-bold">{{ item.name }}</p>
                <span v-if="item.hasDebt" class="b-debt" style="font-size:8px;padding:1px 6px">دين</span>
                <span v-if="item.hasPros" class="b-pros" style="font-size:8px;padding:1px 6px">تركيبات</span>
                <span v-if="item.hasReport" class="report-badge" style="font-size:8px;padding:1px 6px">تقرير</span>
              </div>
              <p class="text-[9px] opacity-35 mt-0.5">{{ item.visitCount }} زيارة • آخر: {{ item.lastDate || '—' }}</p>
            </div>
          </div>
          <div class="cp-row-end">
            <p class="text-xs font-bold n" style="color:var(--gold)">{{ n(item.total) }}</p>
            <p class="text-[8px] opacity-30">{{ cur }}</p>
          </div>
          <button class="cp-more-btn" @click.stop="openMore(item)" title="المزيد">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </template>
    </VirtualScroll>

    <!-- Quick Actions Bottom Sheet -->
    <Teleport to="body">
      <div v-if="moreVisible" class="modal-ol" style="display:flex;align-items:flex-end;justify-content:center;padding:0 12px 24px" @click.self="moreVisible = false">
        <div class="w-full max-w-md glass p-4 rounded-t-3xl rounded-b-2xl space-y-2" @click.stop>
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm" style="color:var(--gold)">{{ morePatient?.name }}</span>
            <button @click="moreVisible = false" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
          </div>
          <button class="cp-action-btn" @click="addVisit">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            زيارة جديدة
          </button>
          <button class="cp-action-btn" @click="viewProfile">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
            السجل الكامل
          </button>
          <button class="cp-action-btn" @click="editPatient">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            تعديل البيانات
          </button>
          <button class="cp-action-btn" @click="viewTreatment">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            خطة العلاج
          </button>
          <button class="cp-action-btn" @click="printPat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            طباعة PDF
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Edit Patient Modal -->
    <Teleport to="body">
      <div v-if="editModalVisible" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="editModalVisible = false">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl">
          <h3 class="font-bold text-sm" style="color:var(--gold)">تعديل بيانات المريض</h3>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">اسم المريض</label>
            <input type="text" v-model="editForm.name" class="inp" placeholder="اسم المريض">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">رقم الهاتف</label>
            <input type="tel" v-model="editForm.phone" class="inp" placeholder="رقم الهاتف" dir="ltr">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">رقم ثاني (اختياري)</label>
            <input type="tel" v-model="editForm.phone2" class="inp" placeholder="رقم إضافي" dir="ltr">
          </div>
          <div class="flex gap-2">
            <button @click="saveEditPatient" class="btn-g flex-1 py-3 text-xs font-bold">حفظ</button>
            <button @click="editModalVisible = false" class="btn-o px-4 py-3 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePatientsStore } from '@/stores/patients.store'
import { formatNumber } from '@/utils/format'
import { fuzzyMatch, fuzzyScore } from '@/utils/search'
import { sanitizeInput } from '@/utils/sanitize'
import VirtualScroll from '@/components/VirtualScroll.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const router = useRouter()
const route = useRoute()
const app = useAppStore()
const auth = useAuthStore()
const patientsStore = usePatientsStore()

const n = formatNumber
const cur = computed(() => app.currency)
const clinicName = computed(() => sanitizeInput(decodeURIComponent(route.params.clinic || '')))
const vsContainerHeight = Math.max(400, window.innerHeight - 260)

const searchQuery = ref('')
const sortBy = ref('recent')
const moreVisible = ref(false)
const morePatient = ref(null)

const patients = computed(() => {
  const map = patientsStore.patientMap
  const cName = clinicName.value
  const debts = app.debts || []

  return Object.values(map)
    .filter(p => p.entries?.some(e => e.clinic === cName))
    .map(p => {
      const activeDebts = debts.filter(d => d.name === p.name && d.status !== 'paid')
      const hasPros = p.entries.some(e => e._s === 'p' || e._t === 'p')
      const hasReport = p.entries.some(e =>
        e.report && (Array.isArray(e.report) ? e.report.length > 0 : (e.report.entries?.length || 0) > 0)
      )
      return {
        ...p,
        hasDebt: activeDebts.length > 0,
        hasPros,
        hasReport,
        services: [...(p.services || [])],
      }
    })
})

const filteredPatients = computed(() => {
  let pts = [...patients.value]
  const q = searchQuery.value.trim()
  if (q) {
    pts = pts.filter(p => fuzzyMatch(q, p.name))
    pts.sort((a, b) => fuzzyScore(q, a.name) - fuzzyScore(q, b.name))
    return pts
  }
  if (sortBy.value === 'name') {
    pts.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  } else if (sortBy.value === 'amount') {
    pts.sort((a, b) => b.total - a.total)
  } else if (sortBy.value === 'date') {
    pts.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
  } else if (sortBy.value === 'modified') {
    pts.sort((a, b) => (b.lastMod || 0) - (a.lastMod || 0))
  } else {
    pts.sort((a, b) => (b.lastMod || 0) - (a.lastMod || 0) || (b.lastDate || '').localeCompare(a.lastDate || ''))
  }
  return pts
})

function goBack() {
  router.push({ name: 'clinics' })
}

function openPatient(p) {
  router.push({ name: 'patient-profile', params: { clinic: clinicName.value, patient: p.name } })
}

function openMore(p) {
  morePatient.value = p
  moreVisible.value = true
}

function addVisit() {
  moreVisible.value = false
  router.push({ name: 'home', query: { patient: morePatient.value?.name, clinic: clinicName.value } })
}

function viewProfile() {
  moreVisible.value = false
  openPatient(morePatient.value)
}

const editModalVisible = ref(false)
const editForm = ref({ name: '', phone: '', phone2: '' })
const editOrigName = ref('')

function editPatient() {
  moreVisible.value = false
  const p = morePatient.value
  if (!p) return
  editOrigName.value = p.name
  const allRecs = [...app.records, ...app.prosthetics, ...app.debts]
    .filter(r => r.name === p.name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  editForm.value = {
    name: p.name,
    phone: allRecs.find(r => r.phone)?.phone || '',
    phone2: allRecs.find(r => r.phone2)?.phone2 || '',
  }
  editModalVisible.value = true
}

function saveEditPatient() {
  const { name, phone, phone2 } = editForm.value
  const origName = editOrigName.value
  if (!name?.trim()) return
  const mod = Date.now()
  const newName = name.trim()
  if (newName !== origName || phone || phone2) {
    let changed = false
    const updRecs = app.records.map(r => {
      if (r.name === origName) {
        changed = true
        return { ...r, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return r
    })
    if (changed) app.records = updRecs
    let changedP = false
    const updPros = app.prosthetics.map(p => {
      if (p.name === origName) {
        changedP = true
        return { ...p, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return p
    })
    if (changedP) app.prosthetics = updPros
    let changedD = false
    const updDebts = app.debts.map(d => {
      if (d.name === origName) {
        changedD = true
        return { ...d, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return d
    })
    if (changedD) app.debts = updDebts
    let changedA = false
    const updAppts = app.appointments.map(a => {
      if (a.name === origName) {
        changedA = true
        return { ...a, name: newName, ...(phone ? { phone } : {}), _mod: mod }
      }
      return a
    })
    if (changedA) app.appointments = updAppts
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false)
  }
  editModalVisible.value = false
}

function viewTreatment() {
  moreVisible.value = false
  openPatient(morePatient.value)
}

function printPat() {
  moreVisible.value = false
  router.push({ name: 'patient-profile', params: { clinic: clinicName.value, patient: morePatient.value?.name }, query: { print: '1' } })
}
</script>

<style scoped>
.cp-row {
  padding: 12px 14px;
  border-radius: 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  transition: all .22s cubic-bezier(0.16,1,0.3,1);
}
.cp-row:active {
  transform: scale(.98);
}
.cp-row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.cp-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(59,130,246,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cp-info {
  min-width: 0;
  flex: 1;
}
.cp-row-end {
  text-align: left;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  position: relative;
}
.cp-more-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(59,130,246,.06);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: .4;
  transition: all .2s;
  color: inherit;
  flex-shrink: 0;
}
.cp-more-btn:hover { opacity: .7; background: rgba(59,130,246,.14); }
.cp-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(59,130,246,.1);
  background: rgba(59,130,246,.04);
  color: var(--gold-l);
  font-size: calc(13px * var(--fs));
  font-weight: 600;
  font-family: -apple-system,'Cairo',sans-serif;
  cursor: pointer;
  transition: all .2s;
}
.cp-action-btn:hover {
  background: rgba(59,130,246,.12);
  border-color: rgba(59,130,246,.3);
}
.cp-action-btn:active {
  transform: scale(.98);
}
.report-badge {
  background: rgba(59,130,246,.12);
  color: var(--gold-l);
  border: 1px solid rgba(59,130,246,.28);
  border-radius: 20px;
  font-weight: 700;
}
</style>
