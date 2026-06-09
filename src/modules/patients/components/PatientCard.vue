<template>
  <div class="pat-card glass p-4 rounded-2xl space-y-2.5">
    <!-- Header row -->
    <div class="flex items-start justify-between gap-2">
      <div style="cursor:pointer" title="صورة المريض — اضغط للتغيير" @click="$emit('openPhoto', patient.name)">
        <img v-if="photo" :src="photo" class="pat-photo" :alt="patient.name">
        <div v-else class="pat-photo-ph">👤</div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <p class="text-sm font-black">{{ patient.name }}</p>
          <span
            v-if="hasReport"
            class="report-badge"
            style="cursor:pointer"
            @click.stop="$emit('open-report', patient.name)"
          >
            <IconRecords :size="10" style="display:inline;vertical-align:-1px" /> تقرير
          </span>
          <span v-if="hasPros" class="b-pros">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline;vertical-align:-1px"><path d="M12 2C8 2 6 5 6 8c0 4 6 14 6 14s6-10 6-14c0-3-2-6-6-6z"/><circle cx="12" cy="8" r="2"/></svg>
            تركيبات
          </span>
          <span
            v-if="activeDebts.length"
            class="b-debt badge-click"
            title="اضغط لعرض الديون"
            @click.stop="$emit('settle-debt', patient.name)"
          >
            <IconDebts :size="10" style="display:inline;vertical-align:-1px" />
            {{ activeDebts.length }} دين
          </span>
        </div>
        <p class="text-[10px] opacity-40 mt-0.5">
          آخر زيارة: {{ patient.lastDate || '—' }} • {{ patient.visitCount }} زيارة
        </p>
        <p v-if="treatmentPlan.length" class="text-[9px] mt-0.5" style="color:var(--green)">
          خطة علاج: {{ tpDone }}/{{ treatmentPlan.length }} مرحلة
        </p>
      </div>

      <div class="text-left flex-shrink-0">
        <p class="text-sm font-black" style="color:var(--gold)">
          <span class="n">{{ formatNumber(patient.total) }}</span>
        </p>
        <p class="text-[9px] opacity-35">{{ currency }}</p>
      </div>
    </div>

    <!-- Summary box -->
    <div class="pat-summary-box" style="grid-template-columns:repeat(4,1fr)">
      <div>
        <div class="ps-val">{{ patient.visitCount }}</div>
        <div class="ps-lbl">زيارة</div>
      </div>
      <div title="إجمالي تكلفة الخدمات">
        <div class="ps-val" style="color:var(--gold-l)">{{ formatNumber(patient.grossTotal) }}</div>
        <div class="ps-lbl">الإجمالي {{ currency }}</div>
      </div>
      <div title="إجمالي المبالغ المدفوعة فعلياً">
        <div class="ps-val" style="color:var(--green)">{{ formatNumber(patient.total) }}</div>
        <div class="ps-lbl">المدفوع {{ currency }}</div>
      </div>
      <div
        :style="patient.debtRemaining > 0 ? 'cursor:pointer' : ''"
        :title="patient.debtRemaining > 0 ? 'رصيد مستحق — اضغط للتفاصيل' : 'لا ديون مستحقة'"
        @click="patient.debtRemaining > 0 && $emit('settle-debt', patient.name)"
      >
        <div
          class="ps-val"
          :style="{
            color: patient.debtRemaining > 0 ? 'var(--red)' : 'var(--green)',
            textDecoration: patient.debtRemaining > 0 ? 'underline dotted' : 'none'
          }"
        >
          {{ patient.debtRemaining > 0 ? formatNumber(patient.debtRemaining) : '✓' }}
        </div>
        <div class="ps-lbl">{{ patient.debtRemaining > 0 ? 'المتبقي ↗' : 'لا ديون' }}</div>
      </div>
    </div>

    <!-- Service tags -->
    <div v-if="serviceTags.length" class="flex flex-wrap gap-1">
      <span
        v-for="svc in serviceTags"
        :key="svc"
        class="report-badge badge-click"
        style="font-size:9px"
      >{{ svc }}</span>
      <span v-if="moreServices > 0" class="text-[9px] opacity-40">+{{ moreServices }}</span>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2 pt-1">
      <button class="btn-o px-3 py-1.5 text-[10px] flex-1 flex items-center justify-center gap-1" @click="toggleDetail">
        <IconRecords :size="12" /> {{ showingDetail ? 'إخفاء السجل' : 'السجل الكامل' }}
      </button>
      <button class="btn-g px-3 py-1.5 text-[10px] flex-1 flex items-center justify-center gap-1" @click="$emit('add-visit', patient.name)">
        <IconAdd :size="12" /> زيارة جديدة
      </button>
      <button class="btn-o px-2 py-1.5 text-[10px] flex items-center justify-center gap-0.5" title="عرض في السجلات" @click="$emit('go-records', patient.name)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
      </button>
      <button class="btn-o px-2 py-1.5 text-[10px] flex items-center justify-center gap-0.5" title="خطة العلاج" @click="$emit('open-treatment', patient.name)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      </button>
      <button class="pat-pdf-btn" @click="$emit('print', patient.name)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      </button>
      <button class="btn-o px-2 py-1.5 text-[10px] flex items-center justify-center gap-0.5" title="تعديل بيانات المريض" @click="$emit('edit', patient.name)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="ic-btn ic-del" style="width:30px;height:30px" title="حذف جميع بيانات المريض" @click="$emit('delete', patient.name)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>

    <!-- Settle debt button -->
    <button
      v-if="activeDebts.length"
      class="w-full py-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2"
      style="background:linear-gradient(135deg,rgba(74,222,128,.15),rgba(34,197,94,.08));border:1px solid rgba(74,222,128,.3);color:#4ade80;transition:all .2s"
      @click="$emit('settle-debt', patient.name)"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
      تسديد الدين ({{ formatNumber(patient.debtRemaining) }} {{ currency }})
    </button>

    <!-- WhatsApp buttons -->
    <div v-if="waPhone" class="flex gap-1.5">
      <a
        :href="`https://wa.me/${waPhone}?text=${waMsg}`"
        class="whatsapp-btn flex-1 justify-center py-1.5"
        target="_blank"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        واتساب
      </a>
      <button
        class="btn-o flex-1 justify-center py-1.5 text-[10px] flex items-center gap-1"
        @click="$emit('show-wa-templates', patient.name, waPhone)"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        قوالب
      </button>
    </div>

    <!-- X-Ray button -->
    <button v-if="hasXrays" class="btn-o w-full py-1.5 text-[10px] flex items-center justify-center gap-1.5" @click="$emit('open-xray', patient.name)">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      صور الأشعة ({{ xrayCount }})
    </button>

    <!-- Detail section (collapsible) -->
    <div v-if="showingDetail" class="space-y-2 pt-2 border-t border-white/10">

      <!-- Financial Summary -->
      <div class="glass-sm p-3 rounded-xl" style="background:rgba(59,130,246,.04);border-color:rgba(59,130,246,.12)">
        <p class="text-[9px] font-bold opacity-55 mb-2">الملخص المالي</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
          <div><p class="text-[8px] opacity-40">تكلفة الخدمات</p><p class="text-sm font-black" style="color:var(--gold-l)">{{ formatNumber(patient.grossTotal) }} <span class="text-[8px] opacity-40">{{ currency }}</span></p></div>
          <div><p class="text-[8px] opacity-40">المدفوع فعلياً</p><p class="text-sm font-black text-green-400">{{ formatNumber(patient.total) }} <span class="text-[8px] opacity-40">{{ currency }}</span></p></div>
          <div><p class="text-[8px] opacity-40">الرصيد المتبقي</p><p class="text-sm font-black" :class="patient.debtRemaining > 0 ? 'text-red-400' : 'text-green-400'">{{ patient.debtRemaining > 0 ? formatNumber(patient.debtRemaining) : '0' }} <span class="text-[8px] opacity-40">{{ currency }}</span></p></div>
        </div>
      </div>

      <!-- Debt Records -->
      <div v-if="activeDebts.length" class="glass-sm p-2.5 rounded-xl" style="background:rgba(255,68,85,.06);border-color:rgba(255,68,85,.2)">
        <p class="text-[9px] font-bold opacity-60 mb-1.5">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg>
          سجل الديون (اضغط للتفاصيل):
        </p>
        <div v-for="d in activeDebts" :key="d.id" class="flex justify-between items-center text-[9px] py-1 px-1 rounded-lg cursor-pointer" style="background:rgba(255,255,255,.03);margin-bottom:2px" @click="$emit('settle-debt', patient.name)">
          <span class="opacity-60">{{ d.date }} — {{ d.status === 'paid' ? '✅ مسدد' : d.status === 'partial' ? '⚠️ جزئي' : '❌ غير مدفوع' }}</span>
          <span class="n font-bold" :class="d.status === 'paid' ? 'text-green-400' : 'text-red-400'">{{ formatNumber(d.remaining || 0) }} {{ currency }} ›</span>
        </div>
      </div>

      <!-- X-Ray Images -->
      <div class="glass-sm p-2.5 rounded-xl" style="background:rgba(59,130,246,.04);border-color:rgba(59,130,246,.13)">
        <p class="text-[9px] font-bold opacity-55 mb-1.5">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
          صور الأشعة ({{ xrayCount }})
        </p>
        <div v-if="xrayCount > 0" class="flex flex-wrap gap-1.5 mb-2">
          <div v-for="(img, i) in xrayList" :key="i" class="cursor-pointer" @click="$emit('open-xray', patient.name, i)">
            <div v-if="!xraySrc(img)" class="w-[52px] h-[52px] rounded-lg border border-white/10 flex items-center justify-center" style="background:rgba(59,130,246,.08)">
              <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,.5)" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
            </div>
            <img v-else :src="xraySrc(img)" :alt="'أشعة'" class="w-[52px] h-[52px] object-cover rounded-lg border border-white/10" loading="lazy">
          </div>
        </div>
        <p v-else class="text-[10px] opacity-30 text-center py-2">لا توجد صور أشعة</p>
        <div v-if="uploading" class="mt-1 flex items-center justify-center gap-2 text-[11px] py-2.5 rounded-xl" style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);color:var(--gold-l)">
          <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          جاري التحميل...
        </div>
        <label v-else class="xray-upload-btn mt-1 cursor-pointer flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-xl" style="background:rgba(59,130,246,.08);border:1px dashed rgba(59,130,246,.25);color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          إرفاق صور أشعة
          <input type="file" accept="image/*" multiple class="hidden" @change="onXrayUpload">
        </label>
      </div>

      <!-- Entries list -->
      <div
        v-for="entry in sortedEntries"
        :key="entry.id"
        class="flex justify-between items-center px-2 py-1.5 rounded-xl"
        style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold">{{ entry.service || 'علاج' }} <span class="opacity-40 font-normal">• {{ entry.date || '' }}</span></p>
          <div class="flex gap-1 mt-0.5 flex-wrap">
            <span v-if="entry.isDebt" class="b-debt" style="font-size:8px">دين</span>
            <span v-if="entry.isDebtPayment" class="text-[8px] px-1.5 py-0.5 rounded-full" style="background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.2)">دفعة دين</span>
            <span v-if="entry.isPros || entry._t === 'p'" class="b-pros" style="font-size:8px">تركيبات</span>
          </div>
        </div>
        <span class="text-xs font-bold flex-shrink-0" style="color:var(--gold)"><span class="n">{{ formatNumber(entry.amount || entry.total || 0) }}</span></span>
      </div>
      <div v-if="patient.entries.length > 30" class="text-center text-[10px] opacity-40 py-2">
        +{{ patient.entries.length - 30 }} سجل إضا��ي
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePatientsStore } from '@/stores/patients.store'
import { useAppStore } from '@/stores/app.store'
import { formatNumber } from '@/utils/format'
import { getImageUrl, getThumbnailUrl, uploadXrayImage, xrayVersion, preloadThumbnails } from '@/services/image.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import IconRecords from '@/components/icons/IconRecords.vue'
import IconAdd from '@/components/icons/IconAdd.vue'
import IconDebts from '@/components/icons/IconDebts.vue'

const props = defineProps({
  patient: { type: Object, required: true },
})

const patientsStore = usePatientsStore()
const appStore = useAppStore()
const authStore = useAuthStore()
const { toast } = useToast()

const showingDetail = ref(false)
const uploading = ref(false)
const emit = defineEmits([
  'add-visit', 'open-detail', 'open-report', 'open-treatment',
  'print', 'edit', 'delete', 'settle-debt', 'openPhoto',
  'show-wa-templates', 'open-xray', 'go-records',
])

function toggleDetail() {
  showingDetail.value = !showingDetail.value
  emit('open-detail', props.patient.name)
  if (showingDetail.value && xrayList.value.length) {
    preloadThumbnails(xrayList.value)
  }
}

const currency = computed(() => appStore.currency)

const photo = computed(() => patientsStore.getPatientPhoto(props.patient.name))
const activeDebts = computed(() => patientsStore.getActiveDebts(props.patient.name))
const hasReport = computed(() => patientsStore.hasReport(props.patient))
const hasPros = computed(() => patientsStore.hasProsthetics(props.patient))
const treatmentPlan = computed(() => patientsStore.getTreatmentPlan(props.patient.name))
const tpDone = computed(() => treatmentPlan.value.filter(s => s.done).length)

const serviceTags = computed(() => [...props.patient.services].slice(0, 3))
const moreServices = computed(() => Math.max(0, props.patient.services.size - 3))

const waPhone = computed(() => patientsStore.getPatientPhone(props.patient.name))
const waMsg = computed(() => encodeURIComponent(`السلام عليكم ${props.patient.name}, هذا تذكير من العيادة`))

const xrayList = computed(() => (appStore.config.patientXrays && appStore.config.patientXrays[props.patient.name]) || [])
const hasXrays = computed(() => xrayList.value.length > 0)
const xrayCount = computed(() => xrayList.value.length)

// Depend on xrayVersion to re-render when thumbnails are restored from R2
function xraySrc(im) {
  void xrayVersion.value
  const key = typeof im === 'string' ? im : im.key
  if (!key) return im.url || im.src || ''
  if (key.startsWith('http') || key.startsWith('data:')) return key
  return getThumbnailUrl(key)
}

function xrayFullSrc(im) {
  void xrayVersion.value
  const key = typeof im === 'string' ? im : im.key
  if (!key) return im.url || im.src || ''
  if (key.startsWith('http') || key.startsWith('data:')) return key
  return getImageUrl(key)
}

const sortedEntries = computed(() => {
  return [...props.patient.entries].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30)
})

async function onXrayUpload(e) {
  const files = e.target.files
  if (!files || !files.length) return
  uploading.value = true
  const name = props.patient.name
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
        return await uploadXrayImage(file, name, uid)
      } catch (err) {
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
  e.target.value = ''
}
</script>
