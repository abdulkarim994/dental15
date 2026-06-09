<template>
  <div class="space-y-3">
    <div v-if="!report" class="text-center opacity-35 py-8 text-xs">
      لا توجد بيانات لهذا الشهر
    </div>
    <template v-else>
      <!-- Records Summary -->
      <div class="glass p-4 rounded-2xl space-y-2">
        <p class="text-xs font-bold" style="color:var(--gold)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
          السجلات
        </p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex justify-between"><span class="opacity-50">العدد:</span><span class="n">{{ report.records.count }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">كاش:</span><span class="n text-green-400">{{ n(report.records.cash) }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">تحويل:</span><span class="n text-blue-400">{{ n(report.records.xfer) }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">إجمالي:</span><span class="n font-bold" style="color:var(--gold)">{{ n(report.records.total) }}</span></div>
        </div>
      </div>

      <!-- Prosthetics Summary -->
      <div v-if="report.prosthetics.count" class="glass p-4 rounded-2xl space-y-2">
        <p class="text-xs font-bold" style="color:var(--gold)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/></svg>
          التركيبات
        </p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex justify-between"><span class="opacity-50">العدد:</span><span class="n">{{ report.prosthetics.count }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">الإيراد:</span><span class="n">{{ n(report.prosthetics.revenue) }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">المعمل:</span><span class="n text-orange-400">{{ n(report.prosthetics.labCost) }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">الربح:</span><span class="n text-green-400">{{ n(report.prosthetics.profit) }}</span></div>
        </div>
      </div>

      <!-- Totals -->
      <div class="glass p-4 rounded-2xl">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex justify-between"><span class="opacity-50">ربح الطبيب:</span><span class="n font-bold text-green-400">{{ n(report.totals.doctorTotal) }}</span></div>
          <div class="flex justify-between"><span class="opacity-50">ربح العيادة:</span><span class="n font-bold text-blue-400">{{ n(report.totals.clinicTotal) }}</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '@/utils/format'
import { getMonthlyReport } from './reports.service'

const n = formatNumber

const props = defineProps({
  records: { type: Array, default: () => [] },
  prosthetics: { type: Array, default: () => [] },
  debts: { type: Array, default: () => [] },
  month: { type: String, default: '' },
  doctorPct: { type: Number, default: 50 },
})

const report = computed(() => {
  if (!props.month) return null
  return getMonthlyReport(props.records, props.prosthetics, props.debts, props.month, props.doctorPct)
})
</script>
