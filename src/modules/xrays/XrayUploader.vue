<template>
  <div v-if="uploading" class="mt-1 flex items-center justify-center gap-2 text-[11px] py-2.5 rounded-xl" style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);color:var(--gold-l)">
    <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
    جاري التحميل...
  </div>
  <label v-else class="xray-upload-btn mt-1 cursor-pointer flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-xl" style="background:rgba(59,130,246,.08);border:1px dashed rgba(59,130,246,.25);color:var(--gold-l)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    إرفاق صور أشعة
    <input type="file" accept="image/*" multiple class="hidden" @change="onUpload">
  </label>
</template>

<script setup>
import { ref } from 'vue'
import { uploadXray } from './xrays.service'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  patientName: { type: String, required: true },
})
const emit = defineEmits(['uploaded'])

const appStore = useAppStore()
const authStore = useAuthStore()
const { toast } = useToast()
const uploading = ref(false)

async function onUpload(e) {
  const files = e.target.files
  if (!files || !files.length) return
  uploading.value = true
  const name = props.patientName
  const uid = authStore.uid
  const xrays = [...((appStore.config.patientXrays && appStore.config.patientXrays[name]) || [])]
  let anyQueued = false
  // Phase 2 — upload in parallel batches (max 3 at a time) instead of fully
  // sequentially, while preserving the original on-screen order of the images.
  const list = [...files]
  const CONCURRENCY = 3
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(async (file) => {
      try {
        return await uploadXray(file, name, uid)
      } catch {
        toast('خطأ في رفع الصورة')
        return null
      }
    }))
    for (const result of results) {
      if (!result) continue
      xrays.push(result.key)
      if (result.queued) anyQueued = true
    }
  }
  appStore.updateConfig({ patientXrays: { ...appStore.config.patientXrays, [name]: xrays } })
  appStore.saveToCache(uid)
  appStore.syncSave(uid, false)
  uploading.value = false
  if (anyQueued) {
    toast('تم حفظ الصور — سيتم رفعها تلقائياً عند الاتصال')
  } else {
    toast('تم رفع صور الأشعة بنجاح')
  }
  emit('uploaded')
  e.target.value = ''
}
</script>
