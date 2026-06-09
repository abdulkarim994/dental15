<template>
  <div class="space-y-2">
    <div v-if="!items.length" class="text-center opacity-35 py-8 text-xs">
      لا توجد تركيبات
    </div>
    <div
      v-for="item in items"
      :key="item.id"
      class="flex justify-between items-center px-3 py-2.5 rounded-xl"
      style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)"
    >
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-bold">
          {{ item.service || item.type || 'تركيبة' }}
          <span class="opacity-40 font-normal">• {{ item.date || '' }}</span>
        </p>
        <p class="text-[9px] opacity-40">{{ item.clinic || '' }}</p>
      </div>
      <div class="text-left flex-shrink-0">
        <p class="text-xs font-bold" style="color:var(--gold)">
          <span class="n">{{ formatNumber(item.total || 0) }}</span>
          <span class="text-[9px] opacity-50"> {{ currency }}</span>
        </p>
        <p v-if="item.labValue" class="text-[9px] opacity-40">
          معمل: <span class="n">{{ formatNumber(item.labValue) }}</span>
        </p>
      </div>
    </div>
    <div v-if="items.length" class="text-center pt-2">
      <p class="text-[9px] opacity-40">
        إجمالي: <span class="n font-bold" style="color:var(--gold)">{{ formatNumber(total) }}</span> {{ currency }}
        &nbsp;|&nbsp; ربح: <span class="n font-bold text-green-400">{{ formatNumber(profit) }}</span> {{ currency }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '@/utils/format'
import { getProstheticStats } from './prosthetics.service'

const props = defineProps({
  items: { type: Array, default: () => [] },
  currency: { type: String, default: '' },
  doctorPct: { type: Number, default: 50 },
})

const stats = computed(() => getProstheticStats(props.items, props.doctorPct))
const total = computed(() => stats.value.totalRevenue)
const profit = computed(() => stats.value.totalProfit)
</script>
