<template>
  <div class="glass p-4 space-y-3">
    <span class="sec-h">المزامنة</span>
    <div class="flex items-center justify-between">
      <span class="text-xs opacity-60">مزامنة تلقائية</span>
      <label class="tgl">
        <input type="checkbox" v-model="autoSync" @change="save">
        <span class="tgl-s"></span>
      </label>
    </div>
    <div class="flex gap-2 items-center">
      <span class="text-xs opacity-50 whitespace-nowrap">كل:</span>
      <input type="number" v-model.number="syncMin" class="inp flex-1 text-sm" min="5" placeholder="30">
      <span class="text-xs opacity-40">دقيقة</span>
      <button @click="save" class="btn-g px-3 py-2 text-xs">حفظ</button>
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

const autoSync = ref(true)
const syncMin = ref(30)

onMounted(() => {
  autoSync.value = app.config.autoSync !== false
  syncMin.value = app.config.syncMin || 30
})

function save() {
  app.updateConfig({ autoSync: autoSync.value, syncMin: syncMin.value })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حفظ إعدادات المزامنة')
}
</script>
