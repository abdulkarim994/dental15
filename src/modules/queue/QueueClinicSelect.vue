<template>
  <div class="space-y-4">
    <div class="glass p-4 rounded-2xl">
      <h2 class="font-bold text-sm mb-4" style="color:var(--gold)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline;vertical-align:-2px"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1"/><path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>
        اختر العيادة
      </h2>
      <div class="space-y-2">
        <button
          v-for="clinic in clinics"
          :key="clinic"
          class="w-full glass-sm p-4 text-right text-sm font-bold flex items-center justify-between gap-3 transition-all duration-200"
          style="border-radius:16px"
          @click="selectClinic(clinic)"
        >
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style="background:var(--gold-g);color:#fff">
              {{ clinics.indexOf(clinic) + 1 }}
            </span>
            <span>{{ clinic }}</span>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>
    </div>

    <!-- Advance booking section -->
    <div class="glass p-4 rounded-2xl">
      <h3 class="font-bold text-xs mb-3 opacity-60">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline;vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        حجز مسبق ليوم محدد
      </h3>
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label class="text-[9px] opacity-40 block mb-1">التاريخ</label>
          <input type="date" v-model="advanceDate" class="inp text-xs w-full">
        </div>
        <div>
          <label class="text-[9px] opacity-40 block mb-1">العيادة</label>
          <select v-model="advanceClinic" class="inp text-xs w-full">
            <option v-for="c in clinics" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mb-3">
        <button
          v-for="p in periods"
          :key="p.id"
          class="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
          :class="advancePeriod === p.id ? 'btn-g' : 'btn-o'"
          @click="advancePeriod = p.id"
        >{{ p.label }}</button>
      </div>
      <button class="btn-g w-full py-3 text-xs font-bold" style="border-radius:14px" @click="goAdvance">
        فتح قائمة الانتظار
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config.store'
import { useQueueStore } from '@/stores/queue.store'

const router = useRouter()
const configStore = useConfigStore()
const queueStore = useQueueStore()

const clinics = computed(() => configStore.clinics || [])

const periods = [
  { id: 'morning', label: 'صباحي' },
  { id: 'evening', label: 'مسائي' },
]

const advanceDate = ref('')
const advanceClinic = ref('')
const advancePeriod = ref('morning')

function selectClinic(clinic) {
  queueStore.selectedClinic = clinic
  const today = new Date()
  queueStore.selectedDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  router.push({ name: 'queue-view', params: { clinic: encodeURIComponent(clinic) } })
}

function goAdvance() {
  if (!advanceDate.value || !advanceClinic.value) return
  queueStore.selectedClinic = advanceClinic.value
  queueStore.selectedDate = advanceDate.value
  queueStore.selectedPeriod = advancePeriod.value
  router.push({ name: 'queue-view', params: { clinic: encodeURIComponent(advanceClinic.value) } })
}
</script>
