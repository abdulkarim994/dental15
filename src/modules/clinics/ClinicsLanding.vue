<template>
  <div class="space-y-4">
    <!-- Clinic Cards -->
    <div class="clinics-grid">
      <div
        v-for="(cli, idx) in clinicCards"
        :key="cli.name"
        class="clinic-card glass"
        :style="{ borderColor: idx === 0 ? 'rgba(59,130,246,.35)' : 'rgba(56,189,248,.35)' }"
        @click="openClinic(cli.name)"
      >
        <div class="clinic-card-header">
          <div class="clinic-icon" :style="{ background: idx === 0 ? 'rgba(59,130,246,.15)' : 'rgba(56,189,248,.15)' }">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" :style="{ color: idx === 0 ? 'var(--gold)' : 'var(--orange)' }"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/></svg>
          </div>
          <h3 class="clinic-name" :style="{ color: idx === 0 ? 'var(--gold-l)' : 'var(--orange)' }">{{ cli.name }}</h3>
        </div>

        <div class="clinic-stats">
          <div class="clinic-stat">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px;opacity:.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <span class="clinic-stat-val">{{ cli.patientCount }}</span>
            <span class="clinic-stat-lbl">مريض</span>
          </div>
          <div class="clinic-stat">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px;opacity:.5"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg>
            <span class="clinic-stat-val n">{{ n(cli.income) }}</span>
            <span class="clinic-stat-lbl">{{ cur }}</span>
          </div>
        </div>

        <div v-if="cli.debtCount > 0" class="clinic-debt-badge">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {{ cli.debtCount }} دين معلق
        </div>

        <div class="clinic-card-footer">
          <span class="text-[10px] opacity-40">{{ cli.visitCount }} زيارة هذا الشهر</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;transform:scaleX(-1)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>

    <!-- Search across all clinics -->
    <div class="glass p-4 rounded-2xl">
      <div class="relative">
        <input
          type="text"
          v-model="searchQuery"
          class="inp"
          placeholder="بحث في كل العيادات..."
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
      <div v-if="searchResults.length" class="mt-3 space-y-1.5">
        <div
          v-for="p in searchResults"
          :key="p.name"
          class="row-card p-3 flex justify-between items-center cursor-pointer"
          @click="openPatient(p)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="text-xs font-bold">{{ p.name }}</p>
              <span v-if="p.clinic" class="text-[9px] opacity-40" style="color:var(--gold-l)">{{ p.clinic }}</span>
            </div>
            <p class="text-[9px] opacity-35">{{ p.visitCount }} زيارة • آخر: {{ p.lastDate || '—' }}</p>
          </div>
          <div class="text-left flex-shrink-0">
            <p class="text-xs font-bold n" style="color:var(--gold)">{{ n(p.total) }}</p>
            <p class="text-[9px] opacity-30">{{ cur }}</p>
          </div>
        </div>
      </div>
      <div v-else-if="searchQuery.trim()" class="mt-3 text-center py-4 opacity-30">
        <p class="text-xs">لا توجد نتائج</p>
      </div>
    </div>

    <!-- Archive shortcut -->
    <div class="glass p-4 rounded-2xl cursor-pointer" style="border-color:rgba(59,130,246,.15)" @click="goArchive">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,.1);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </div>
          <div>
            <p class="text-xs font-bold" style="color:var(--gold-l)">الأرشيف</p>
            <p class="text-[9px] opacity-35">عرض السجلات المؤرشفة لجميع الأشهر</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.3;transform:scaleX(-1)"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { usePatientsStore } from '@/stores/patients.store'
import { formatNumber } from '@/utils/format'
import { fuzzyMatch, fuzzyScore } from '@/utils/search'
import { debounce } from '@/utils/debounce'

const router = useRouter()
const app = useAppStore()
const patientsStore = usePatientsStore()

const n = formatNumber
const cur = computed(() => app.currency)
const searchQuery = ref('')

const clinicCards = computed(() => {
  const clinics = app.clinics || []
  const month = app.selectedMonth
  const allRecs = [...(app.records || []), ...(app.prosthetics || [])]
  const monthRecs = allRecs.filter(r => (r.date || '').substring(0, 7) === month && !r.isDebtPayment)
  const debts = app.debts || []

  return clinics.map(name => {
    const cRecs = monthRecs.filter(r => r.clinic === name)
    const patients = new Set()
    cRecs.forEach(r => { if (r.name) patients.add(r.name) })
    const income = cRecs.reduce((s, r) => {
      const hasDebt = r.isPros
        ? debts.some(d => d.prostheticId === r.id)
        : debts.some(d => d.recordId === r.id)
      if (hasDebt) return s
      return s + (Number(r.amount) || 0)
    }, 0)
    const debtPayments = (app.records || []).filter(r =>
      r.isDebtPayment && r.clinic === name && (r.date || '').substring(0, 7) === month
    ).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const cDebts = debts.filter(d => d.clinic === name && d.status !== 'paid')

    return {
      name,
      patientCount: patients.size,
      visitCount: cRecs.length,
      income: income + debtPayments,
      debtCount: cDebts.length,
    }
  })
})

const searchResults = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return []
  const map = patientsStore.patientMap
  let pts = Object.values(map).filter(p => fuzzyMatch(q, p.name))
  pts.sort((a, b) => fuzzyScore(q, a.name) - fuzzyScore(q, b.name))

  return pts.slice(0, 15).map(p => {
    const clinic = p.entries?.[0]?.clinic || ''
    return { ...p, clinic }
  })
})

const onSearch = debounce(() => {}, 200)

function openClinic(name) {
  router.push({ name: 'clinic-patients', params: { clinic: name } })
}

function openPatient(p) {
  const clinic = p.clinic || (app.clinics?.[0]) || ''
  router.push({ name: 'patient-profile', params: { clinic, patient: p.name } })
}

function goArchive() {
  router.push({ name: 'archive' })
}
</script>

<style scoped>
.clinics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 360px) {
  .clinics-grid { grid-template-columns: 1fr; }
}
.clinic-card {
  padding: 16px;
  border-radius: 22px;
  cursor: pointer;
  transition: all .28s cubic-bezier(0.16,1,0.3,1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.clinic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(0,0,0,.22);
}
.clinic-card:active {
  transform: scale(.97);
}
.clinic-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.clinic-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.clinic-name {
  font-size: calc(13px * var(--fs));
  font-weight: 800;
  letter-spacing: .02em;
}
.clinic-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.clinic-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: calc(11px * var(--fs));
}
.clinic-stat-val {
  font-weight: 800;
  color: var(--gold-l);
  font-size: calc(12px * var(--fs));
}
.clinic-stat-lbl {
  opacity: .4;
  font-size: calc(9px * var(--fs));
}
.clinic-debt-badge {
  background: rgba(255,68,85,.1);
  border: 1px solid rgba(255,68,85,.25);
  border-radius: 10px;
  padding: 5px 10px;
  font-size: calc(10px * var(--fs));
  font-weight: 700;
  color: var(--red);
  text-align: center;
}
.clinic-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,.06);
  padding-top: 8px;
  margin-top: auto;
}
</style>
