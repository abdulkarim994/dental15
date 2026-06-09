<template>
  <div class="glass p-4 space-y-3">
    <span class="sec-h">تصدير / استيراد البيانات</span>
    <button @click="exportData" class="btn-o w-full py-2.5 text-xs flex items-center justify-center gap-2">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      تصدير JSON
    </button>
    <label class="btn-o w-full py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      استيراد JSON
      <input type="file" accept=".json" class="hidden" @change="importData">
    </label>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

function exportData() {
  const data = {
    records: app.records,
    prosthetics: app.prosthetics,
    debts: app.debts,
    appointments: app.appointments,
    config: app.config,
    exportDate: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dental-backup-${new Date().toISOString().substring(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('تم تصدير البيانات')
}

function importData(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (data.records) app.records = data.records
      if (data.prosthetics) app.prosthetics = data.prosthetics
      if (data.debts) app.debts = data.debts
      if (data.appointments) app.appointments = data.appointments
      if (data.config) app.updateConfig(data.config)
      app.saveToCache(auth.uid)
      toast('تم استيراد البيانات بنجاح')
    } catch {
      toast('ملف غير صالح')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>
