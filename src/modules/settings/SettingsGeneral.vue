<template>
  <div class="space-y-4">
    <!-- Center Name -->
    <div class="glass p-4 space-y-3">
      <span class="sec-h">اسم المركز</span>
      <div class="flex gap-2">
        <input type="text" v-model="localName" class="inp flex-1 text-sm" placeholder="طب الأسنان الرقمي">
        <button @click="save" class="btn-g px-4 py-2 text-xs">حفظ</button>
      </div>
    </div>
    <!-- Currency -->
    <div class="glass p-4 space-y-3">
      <span class="sec-h">عملة الدفع</span>
      <div class="flex gap-2">
        <input type="text" v-model="localCurrency" class="inp flex-1 text-sm" placeholder="د.ل">
        <button @click="saveCurrency" class="btn-g px-4 py-2 text-xs">حفظ</button>
      </div>
    </div>
    <!-- Doctor Percentage -->
    <div class="glass p-4 space-y-3">
      <span class="sec-h">نسبة الطبيب في التركيبات</span>
      <div class="flex gap-2 items-center">
        <input type="number" v-model.number="localPct" class="inp flex-1 text-sm" min="0" max="100">
        <span class="opacity-50">%</span>
        <button @click="savePct" class="btn-g px-4 py-2 text-xs">حفظ</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

const localName = ref('')
const localCurrency = ref('')
const localPct = ref(50)

onMounted(() => {
  localName.value = app.config.centerName || ''
  localCurrency.value = app.config.currency || 'د.ل'
  localPct.value = app.config.doctorPct ?? 50
})

function save() {
  app.updateConfig({ centerName: localName.value.trim() })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حفظ اسم المركز')
}
function saveCurrency() {
  app.updateConfig({ currency: localCurrency.value.trim() })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حفظ العملة')
}
function savePct() {
  app.updateConfig({ doctorPct: localPct.value })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حفظ النسبة')
}
</script>
