<template>
  <div class="space-y-4">
    <!-- Today Summary -->
    <div class="glass p-5 rounded-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-sm" style="color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ملخص اليوم
        </h2>
        <span class="text-[10px] opacity-40">{{ todayDate }}</span>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="stat-card p-3 text-center">
          <div class="text-lg font-black" style="color:var(--gold)">{{ todayPatients || '—' }}</div>
          <div class="text-[9px] opacity-45">مريض</div>
        </div>
        <div class="stat-card p-3 text-center">
          <div class="text-lg font-black text-green-400">{{ todayIncome > 0 ? n(todayIncome) : '—' }}</div>
          <div class="text-[9px] opacity-45">دخل اليوم {{ cur }}</div>
        </div>
        <div class="stat-card p-3 text-center" style="cursor:pointer" @click="goFinance" v-if="pendingDebts > 0">
          <div class="text-lg font-black" style="color:var(--red)">{{ pendingDebts }}</div>
          <div class="text-[9px] opacity-45" style="color:var(--red)">ديون معلقة</div>
        </div>
        <div class="stat-card p-3 text-center" v-else>
          <div class="text-lg font-black text-green-400">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div class="text-[9px] opacity-45">لا ديون</div>
        </div>
      </div>
    </div>

    <!-- Month Summary -->
    <div class="glass p-5 rounded-2xl space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-sm" style="color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ملخص الشهر
        </h2>
        <span class="text-[10px] opacity-40 n">{{ app.selectedMonth }}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-card p-3 text-center">
          <div class="text-[9px] opacity-45 mb-1">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="12" cy="15" r="2"/></svg>
            كاش
          </div>
          <div class="text-sm font-bold text-green-400 n">{{ n(monthCash) }}</div>
          <div class="text-[8px] opacity-30">{{ cur }}</div>
        </div>
        <div class="stat-card p-3 text-center">
          <div class="text-[9px] opacity-45 mb-1">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/><path d="M8 15h4"/></svg>
            تحويل
          </div>
          <div class="text-sm font-bold text-blue-400 n">{{ n(monthXfer) }}</div>
          <div class="text-[8px] opacity-30">{{ cur }}</div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-3 text-center">
        <div class="text-[9px] opacity-35 mb-1">إجمالي الشهر</div>
        <div class="text-xl font-black n" style="color:var(--gold)">{{ n(monthTotal) }} {{ cur }}</div>
      </div>
    </div>

    <!-- Upcoming Appointments -->
    <div v-if="upcomingAppts.length" class="glass p-4 rounded-2xl space-y-2">
      <h2 class="font-bold text-sm" style="color:var(--gold-l)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        مواعيد اليوم ({{ upcomingAppts.length }})
      </h2>
      <div v-for="a in upcomingAppts" :key="a.id" class="row-card p-3 flex justify-between items-center">
        <div>
          <p class="text-xs font-bold">{{ a.name || '—' }}</p>
          <p class="text-[9px] opacity-40">{{ a.service || '' }}</p>
        </div>
        <span class="text-xs font-bold n" style="color:var(--gold-l)">{{ a.time ? formatTime12h(a.time) : '—' }}</span>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="glass p-4 rounded-2xl space-y-2">
      <h2 class="font-bold text-sm" style="color:var(--gold-l)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        آخر السجلات
      </h2>
      <div v-if="!recentRecords.length" class="text-center py-6 opacity-30">
        <p class="text-xs">لا توجد سجلات حديثة</p>
      </div>
      <div v-for="r in recentRecords" :key="r.id" class="row-card p-3 flex justify-between items-center">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold truncate" style="color:var(--gold)">{{ r.name || '' }}</p>
          <p class="text-[9px] opacity-35">{{ r.date }} • {{ r.service || '' }}</p>
        </div>
        <div class="text-left flex-shrink-0">
          <p class="text-xs font-bold n" :class="r.payment === 'كاش' ? 'text-green-400' : r.payment === 'دين' ? 'text-red-400' : 'text-blue-400'">{{ n(r.amount) }}</p>
          <p class="text-[9px] opacity-30">{{ cur }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { formatNumber, getCurrentMonth } from '@/utils/format'
import { sortByNewest, sum, isProsDebtPay } from '@/utils/helpers'

const router = useRouter()
const app = useAppStore()

const n = formatNumber
const cur = computed(() => app.currency)
const today = new Date().toISOString().substring(0, 10)
const todayDate = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const todayRecords = computed(() => {
  const all = [...(app.records || []), ...(app.prosthetics || [])]
  return all.filter(r => r.date === today && !r.isDebtPayment)
})

const todayPatients = computed(() => {
  const names = new Set()
  todayRecords.value.forEach(r => { if (r.name) names.add(r.name) })
  return names.size
})

const todayIncome = computed(() => {
  return todayRecords.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)
})

const pendingDebts = computed(() => {
  return (app.debts || []).filter(d => d.status !== 'paid').length
})

const currentMonth = computed(() => app.selectedMonth || getCurrentMonth())

const monthRecords = computed(() => {
  const m = currentMonth.value
  const all = [...(app.records || []), ...(app.prosthetics || [])]
  return all.filter(r => (r.date || '').substring(0, 7) === m && !r.isDebtPayment)
})

const monthCash = computed(() => {
  return monthRecords.value.filter(r => r.payment === 'كاش').reduce((s, r) => s + (Number(r.amount) || 0), 0)
})

const monthXfer = computed(() => {
  return monthRecords.value.filter(r => r.payment === 'تحويل').reduce((s, r) => s + (Number(r.amount) || 0), 0)
})

const monthTotal = computed(() => monthCash.value + monthXfer.value)

const upcomingAppts = computed(() => {
  return (app.appointments || [])
    .filter(a => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5)
})

const recentRecords = computed(() => {
  const all = [...(app.records || []), ...(app.prosthetics || [])]
  return all
    .filter(r => !r.isDebtPayment)
    .sort((a, b) => (b._mod || 0) - (a._mod || 0) || (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5)
})

function formatTime12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function goFinance() {
  router.push({ name: 'finance', query: { section: 'debts' } })
}
</script>
