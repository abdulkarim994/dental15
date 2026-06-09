<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-ol" style="display:flex;align-items:flex-start;justify-content:center;padding-top:20px" @click.self="tryClose">
      <div class="glass p-4 w-full max-w-md mx-3 space-y-4 rounded-2xl max-h-[92vh] overflow-y-auto" @click.stop>
        <div class="flex justify-between items-center">
          <h3 class="font-bold text-sm" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M7 2C4 2 2 5 2 8c0 4 2.5 6 4 9 1 2 2 5 3 5s1.5-2 3-2 1.5 2 3 2 2-3 3-5c1.5-3 4-5 4-9 0-3-2-6-5-6-1.5 0-2.5.5-3 1.5S12.5 2 11 2c-1.5 0-2.5.5-3 1.5"/></svg>
            تقرير الأسنان
          </h3>
          <button @click="tryClose" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
        </div>

        <!-- Tooth Chart SVG -->
        <div class="glass-sm p-3 rounded-2xl">
          <div class="flex justify-center mb-2">
            <svg ref="svgEl" viewBox="0 0 320 215" width="100%" style="max-width:320px;display:block"></svg>
          </div>
          <div class="flex flex-wrap gap-1.5 items-center min-h-[28px] p-2 rounded-xl" style="background:rgba(59,130,246,.05);border:1px solid rgba(59,130,246,.15)">
            <span v-if="!selectedTeeth.size" class="text-[9px] opacity-35 w-full text-center">اختر أسناناً من المخطط</span>
            <template v-else>
              <span v-for="key in [...selectedTeeth]" :key="key" class="inline-flex items-center gap-0.5">
                <span class="palmer-cell" :class="palmerClass(key)" style="color:var(--gold-l)">{{ toothNum(key) }}</span>
                <button type="button" @click="removeTooth(key)" style="background:rgba(239,68,68,.18);border:none;color:rgba(252,165,165,.9);font-size:14px;font-weight:700;line-height:1;padding:2px 7px;border-radius:5px;cursor:pointer">×</button>
              </span>
            </template>
          </div>
        </div>

        <!-- Service + Cost -->
        <div class="glass-sm p-3 rounded-2xl space-y-3">
          <div class="relative" ref="svcWrap">
            <button type="button" class="inp w-full text-xs text-right flex justify-between items-center" @click="showSvcDrop = !showSvcDrop">
              <span>{{ currentSvc || 'اختر الخدمة' }}</span>
              <span class="opacity-40">▼</span>
            </button>
            <div v-if="showSvcDrop" class="absolute top-full left-0 right-0 z-50 glass p-2 mt-1 rounded-xl max-h-48 overflow-y-auto space-y-0.5">
              <div v-for="s in allServices" :key="s" class="svc-option p-2 rounded-lg text-xs cursor-pointer hover:bg-blue-500/10" @click="selectSvc(s)">{{ s }}</div>
            </div>
          </div>
          <input type="number" v-model.number="cost" class="inp" placeholder="التكلفة (اختياري)" min="0">
          <button @click="addEntry" class="btn-g w-full py-2.5 text-xs font-bold">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="9.5"/><path d="M12 8v8M8 12h8"/></svg>
            إضافة المعالجة
          </button>
        </div>

        <!-- Report Entries -->
        <div class="space-y-2">
          <div v-if="!entries.length" class="text-center text-xs opacity-30 py-4">
            لا توجد معالجات مضافة بعد
          </div>
          <div v-for="(entry, idx) in entries" :key="idx" class="report-entry" style="gap:10px;align-items:flex-start">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold mb-1">{{ entry.service }}</p>
              <div class="flex flex-wrap gap-1 mb-1">
                <span v-for="t in entry.teeth" :key="t.q+':'+t.n" class="palmer-cell" :class="'q-'+t.q.toLowerCase()" style="color:var(--gold-l)">{{ t.n }}</span>
              </div>
              <p class="text-xs font-bold" style="color:var(--green)"><span class="n">{{ n(entry.cost) }}</span> <span class="text-[9px] opacity-50">{{ currency }}</span></p>
            </div>
            <button @click="removeEntry(idx)" class="ic-btn ic-del flex-shrink-0" style="width:28px;height:28px">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>

        <!-- Total -->
        <div v-if="entries.length" class="glass-sm p-3 text-center rounded-2xl">
          <p class="text-[9px] opacity-40 mb-1">إجمالي التقرير</p>
          <p class="text-lg font-black" style="color:var(--gold)"><span class="n">{{ n(totalCost) }}</span> {{ currency }}</p>
        </div>

        <!-- Patient Info Section -->
        <div class="glass-sm p-3 rounded-2xl space-y-2.5">
          <p class="text-[9px] opacity-38 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            معلومات المريض <span class="opacity-50">(اختياري)</span>
          </p>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" v-model="meta.name" class="inp text-xs" placeholder="الاسم الكامل">
            <input type="text" v-model="meta.phone" class="inp text-xs" placeholder="رقم الجوال">
            <input type="text" v-model="meta.age" class="inp text-xs" placeholder="العمر">
            <input type="text" v-model="meta.dob" class="inp text-xs" placeholder="تاريخ الميلاد">
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[9px] opacity-40">الجنس:</span>
            <label class="cond-lbl"><input type="radio" v-model="meta.gender" value="ذكر"> ذكر</label>
            <label class="cond-lbl"><input type="radio" v-model="meta.gender" value="أنثى"> أنثى</label>
          </div>
          <div>
            <p class="text-[9px] opacity-40 mb-1.5">الأمراض المزمنة:</p>
            <div class="flex flex-wrap gap-1.5">
              <label v-for="c in CONDITIONS" :key="c" class="cond-lbl">
                <input type="checkbox" :value="c" v-model="meta.conditions"> {{ c }}
              </label>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="glass-sm p-3 rounded-2xl space-y-2">
          <textarea v-model="meta.notes" class="inp text-xs h-14 resize-none" placeholder="ملاحظات إضافية..."></textarea>
          <input type="text" v-model="meta.diagnosis" class="inp text-xs" placeholder="التشخيص">
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <button @click="confirmReport" class="btn-g w-full py-3.5 text-sm font-black">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polyline points="20 6 9 17 4 12"/></svg>
            حفظ التقرير
          </button>
          <button v-if="entries.length" @click="printReport" :disabled="pdfBusy" class="btn-o w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2">
            <span v-if="pdfBusy" class="pov-spinner" style="border-color:rgba(59,130,246,.3);border-top-color:#3B82F6"></span>
            <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            {{ pdfBusy ? 'جاري التحويل...' : 'طباعة التقرير' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import { formatNumber } from '@/utils/format'
import { isNative, buildBwDocument, nativePrint } from '@/services/pdf.service'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: Array, default: () => [] },
  reportMeta: { type: Object, default: () => ({}) },
  currency: { type: String, default: 'د.ل' },
  formAmount: { type: Number, default: 0 },
  patientName: { type: String, default: '' },
  patientPhone: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'update:reportMeta', 'close', 'confirm', 'update-amount'])
const app = useAppStore()
const { toast } = useToast()
const { isLight } = useTheme()

const svgEl = ref(null)
const svcWrap = ref(null)
const selectedTeeth = ref(new Set())
const currentSvc = ref('')
const cost = ref(null)
const showSvcDrop = ref(false)
const entries = ref([])
const meta = ref({ notes: '', diagnosis: '', name: '', phone: '', age: '', dob: '', gender: '', conditions: [] })

const CONDITIONS = ['السكري', 'ضغط الدم', 'حمل', 'أمراض القلب', 'الغدة الدرقية', 'حساسية الأدوية', 'الربو', 'أمراض الكلى']
const DENTAL_SVCS = ['حشو', 'حشو عصب', 'خلع', 'تنظيف', 'تاج', 'جسر', 'زراعة', 'تقويم', 'تبييض', 'تركيب متحرك', 'حشو جمالي', 'علاج لثة']

const allServices = computed(() => [...new Set([...(app.services || []), ...DENTAL_SVCS])])
const totalCost = computed(() => entries.value.reduce((s, e) => s + (+e.cost || 0), 0))

const TOOTH_DATA = [
  ['UR',1,144,14,34],['UR',2,129,13,30],['UR',3,113,14,37],['UR',4,96,15,28],['UR',5,79,15,28],['UR',6,57,20,25],['UR',7,35,20,25],['UR',8,16,17,22],
  ['UL',1,162,14,34],['UL',2,178,13,30],['UL',3,193,14,37],['UL',4,209,15,28],['UL',5,226,15,28],['UL',6,243,20,25],['UL',7,265,20,25],['UL',8,287,17,22],
  ['LR',1,144,14,34],['LR',2,129,13,30],['LR',3,113,14,37],['LR',4,96,15,28],['LR',5,79,15,28],['LR',6,57,20,25],['LR',7,35,20,25],['LR',8,16,17,22],
  ['LL',1,162,14,34],['LL',2,178,13,30],['LL',3,193,14,37],['LL',4,209,15,28],['LL',5,226,15,28],['LL',6,243,20,25],['LL',7,265,20,25],['LL',8,287,17,22],
]

function n(v) { return formatNumber(v) }
function palmerClass(key) { return 'q-' + key.split(':')[0].toLowerCase() }
function toothNum(key) { return key.split(':')[1] }

watch(() => props.visible, (v) => {
  if (v) {
    entries.value = props.modelValue?.length ? JSON.parse(JSON.stringify(props.modelValue)) : []
    const rm = props.reportMeta || {}
    meta.value = {
      notes: rm.notes || '', diagnosis: rm.diagnosis || '',
      name: rm.name || props.patientName || '', phone: rm.phone || props.patientPhone || '',
      age: rm.age || '', dob: rm.dob || '', gender: rm.gender || '',
      conditions: rm.conditions ? [...rm.conditions] : [],
    }
    selectedTeeth.value = new Set()
    currentSvc.value = ''
    cost.value = null
    nextTick(() => renderSVG())
  }
})

function hasData() {
  return entries.value.length > 0 || selectedTeeth.value.size > 0 ||
    meta.value.age || meta.value.dob || meta.value.gender || meta.value.conditions?.length > 0 ||
    (cost.value && cost.value > 0)
}

function tryClose() {
  if (!hasData()) { emit('close'); return }
  if (confirm('في حال الخروج ستُمسح بيانات التقرير.\n\nموافق = إغلاق ومسح البيانات\nإلغاء = العودة للتقرير')) {
    emit('close')
  }
}

function confirmReport() {
  if (!entries.value.length) {
    toast('⚠ لم تُضف أي معالجة — التقرير فارغ')
    emit('close')
    return
  }
  const rTotal = totalCost.value
  const entryAmt = props.formAmount || 0
  if (entryAmt > 0 && Math.abs(rTotal - entryAmt) > 0.01) {
    const sync = confirm(`⚠️ مجموع تكاليف التقرير (${n(rTotal)} ${props.currency}) يختلف عن قيمة النموذج (${n(entryAmt)} ${props.currency}).\n\nموافق = تحديث قيمة النموذج تلقائياً\nإلغاء = تخطي`)
    if (sync) emit('update-amount', rTotal)
  }
  emit('update:modelValue', JSON.parse(JSON.stringify(entries.value)))
  emit('update:reportMeta', { ...meta.value })
  emit('confirm')
}

function removeTooth(key) { selectedTeeth.value.delete(key); selectedTeeth.value = new Set(selectedTeeth.value); renderSVG() }
function selectSvc(s) { currentSvc.value = s; showSvcDrop.value = false }

function addEntry() {
  if (!selectedTeeth.value.size) { toast('اختر سناً واحداً على الأقل'); return }
  if (!currentSvc.value) { toast('اختر نوع الخدمة'); return }
  const teeth = [...selectedTeeth.value].map(k => { const [q, tn] = k.split(':'); return { q, n: parseInt(tn) } })
  entries.value.push({ teeth, service: currentSvc.value, cost: cost.value || 0 })
  selectedTeeth.value.clear(); selectedTeeth.value = new Set()
  currentSvc.value = ''; cost.value = null
  renderSVG()
  toast('تمت إضافة المعالجة')
}

function removeEntry(idx) { entries.value.splice(idx, 1) }

const pdfBusy = ref(false)

async function printReport() {
  const clinicName = app.config.centerName || 'عيادة الأسنان'
  const today = new Date().toLocaleDateString('ar')
  const pName = meta.value.name || props.patientName || ''
  const pPhone = meta.value.phone || props.patientPhone || ''
  const cur = props.currency

  const svgContent = svgEl.value ? svgEl.value.innerHTML : ''
  const svgBg = isLight.value ? '#f1f5f9' : '#0e1a30'
  const svgHtml = `<svg viewBox="0 0 320 215" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:400px;display:block;margin:12px auto;background:${svgBg};border-radius:12px;padding:8px">${svgContent}</svg>`

  const entryRows = entries.value.map((e, i) => {
    const teethStr = e.teeth.map(t => `${t.q}:${t.n}`).join(', ')
    return `<tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">${i + 1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${teethStr}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${e.service}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${n(e.cost || 0)} ${cur}</td>
    </tr>`
  }).join('')

  const condStr = meta.value.conditions?.length ? meta.value.conditions.join(' • ') : 'لا يوجد'
  const diagStr = meta.value.diagnosis || '—'
  const notesStr = meta.value.notes || '—'

  const html = `
    <h1>${clinicName}</h1>
    <p class="sub">تقرير طب الأسنان — ${today}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#e2e8f0;margin-bottom:14px">
      <div style="background:#fff;padding:8px 12px"><div style="font-size:8px;color:#94a3b8;font-weight:700">الاسم</div><div style="font-size:12px;font-weight:700;color:#0f172a">${pName || '—'}</div></div>
      <div style="background:#fff;padding:8px 12px"><div style="font-size:8px;color:#94a3b8;font-weight:700">الجوال</div><div style="font-size:12px;font-weight:700;color:#0f172a">${pPhone || '—'}</div></div>
      <div style="background:#fff;padding:8px 12px"><div style="font-size:8px;color:#94a3b8;font-weight:700">العمر</div><div style="font-size:12px;font-weight:700;color:#0f172a">${meta.value.age || '—'}</div></div>
    </div>
    ${svgHtml}
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px">
      <thead><tr style="background:linear-gradient(90deg,#1e3a8a,#1d4ed8);color:#fff">
        <th style="padding:9px 10px;text-align:center;width:36px">#</th>
        <th style="padding:9px 10px;text-align:right">الأسنان</th>
        <th style="padding:9px 10px;text-align:right">الخدمة</th>
        <th style="padding:9px 10px;text-align:right">التكلفة</th>
      </tr></thead>
      <tbody>${entryRows}</tbody>
    </table>
    <div style="text-align:center;padding:10px;background:#f8faff;border:2px solid #1d4ed8;border-radius:8px;margin:8px 0">
      <span style="font-size:10px;color:#94a3b8">إجمالي التكلفة</span>
      <div style="font-size:22px;font-weight:900;color:#1d4ed8">${n(totalCost.value)} ${cur}</div>
    </div>
    <div style="margin:10px 0;font-size:11px">
      <p><strong>التشخيص:</strong> ${diagStr}</p>
      <p><strong>ملاحظات:</strong> ${notesStr}</p>
      <p><strong>الأمراض المزمنة:</strong> ${condStr}</p>
    </div>
    <div style="display:flex;justify-content:space-around;padding:16px 24px;border-top:1px solid #e2e8f0;background:#fafbff">
      <div style="text-align:center;flex:1;padding:0 8px"><div style="border-bottom:1.5px solid #94a3b8;margin:0 8px 4px;height:24px"></div><div style="font-size:9px;color:#64748b;font-weight:600">توقيع الطبيب</div></div>
      <div style="text-align:center;flex:1;padding:0 8px"><div style="border-bottom:1.5px solid #94a3b8;margin:0 8px 4px;height:24px"></div><div style="font-size:9px;color:#64748b;font-weight:600">توقيع المريض</div></div>
      <div style="text-align:center;flex:1;padding:0 8px"><div style="border-bottom:1.5px solid #94a3b8;margin:0 8px 4px;height:24px"></div><div style="font-size:9px;color:#64748b;font-weight:600">ختم المركز</div></div>
    </div>`

  const printStyles = `<style>
    body{font-family:'Cairo',sans-serif;direction:rtl;margin:0;padding:20px}
    h1{text-align:center;font-size:20px;color:#0a1428;margin-bottom:4px}
    .sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    th{background:linear-gradient(90deg,#1e3a8a,#1d4ed8);color:#fff;padding:8px 10px;text-align:right;font-weight:700}
    td{padding:7px 10px;border-bottom:1px solid #eee;text-align:right}
    tr:nth-child(even) td{background:#f9f9f9}
    .print-bar{text-align:center;padding:14px;background:#f8faff;border-bottom:1px solid #e2e8f0;margin:-20px -20px 16px}
    .print-bar button{background:#3B82F6;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif}
    .print-bar button:active{opacity:.8}
    @media print{body{padding:0}.print-bar{display:none!important}@page{size:A4;margin:15mm}}
  </style>`

  const fullHtml = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap">
<title>تقرير طب الأسنان</title>${printStyles}</head><body>
<div class="print-bar"><button onclick="window.print()">🖨️ طباعة / PDF</button></div>
${html}<div style="text-align:center;font-size:9px;color:#888;padding:10px">نظام طب الأسنان الرقمي — ${today}</div></body></html>`

  pdfBusy.value = true
  try {
    if (isNative()) {
      const clinic = { clinicName: app.config.centerName, logo: app.config.logo }
      const bwDoc = buildBwDocument(html, 'تقرير طب الأسنان', clinic)
      await nativePrint(bwDoc, 'تقرير طب الأسنان')
    } else {
      await nativePrint(fullHtml, 'تقرير طب الأسنان')
    }
  } catch (e) {
    console.error('Print failed:', e)
    toast('حدث خطأ أثناء الطباعة')
  } finally {
    pdfBusy.value = false
  }
}

function toggleTooth(q, tn) {
  const key = `${q}:${tn}`
  if (selectedTeeth.value.has(key)) selectedTeeth.value.delete(key)
  else selectedTeeth.value.add(key)
  selectedTeeth.value = new Set(selectedTeeth.value)
  renderSVG()
}

function renderSVG() {
  if (!svgEl.value) return
  const light = isLight.value
  const isUpper = q => q === 'UR' || q === 'UL'
  const lineColor = light ? 'rgba(59,130,246,.25)' : 'rgba(59,130,246,.2)'
  const arcColor = light ? 'rgba(59,130,246,.15)' : 'rgba(59,130,246,.1)'
  const labelColor = light ? 'rgba(30,58,138,.4)' : 'rgba(147,197,253,.42)'
  const sublabelColor = light ? 'rgba(30,58,138,.3)' : 'rgba(147,197,253,.25)'
  let c = `
    <defs><filter id="tglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <line x1="160" y1="6" x2="160" y2="209" stroke="${lineColor}" stroke-width="0.8" stroke-dasharray="3,3"/>
    <line x1="8" y1="110" x2="312" y2="110" stroke="${lineColor}" stroke-width="0.8" stroke-dasharray="3,3"/>
    <path d="M 16,107 Q 90,68 160,65 Q 230,68 304,107" fill="none" stroke="${arcColor}" stroke-width="1.4"/>
    <path d="M 16,113 Q 90,152 160,155 Q 230,152 304,113" fill="none" stroke="${arcColor}" stroke-width="1.4"/>
    <text x="10" y="18" fill="${labelColor}" font-size="8" font-family="Cairo,system-ui,sans-serif" font-weight="600">يمين</text>
    <text x="282" y="18" fill="${labelColor}" font-size="8" font-family="Cairo,system-ui,sans-serif" font-weight="600">يسار</text>
    <text x="52" y="52" fill="${sublabelColor}" font-size="7.5" font-family="Cairo,system-ui,sans-serif">الفك العلوي</text>
    <text x="52" y="170" fill="${sublabelColor}" font-size="7.5" font-family="Cairo,system-ui,sans-serif">الفك السفلي</text>`
  const doneTeeth = new Set(entries.value.flatMap(e => e.teeth.map(t => `${t.q}:${t.n}`)))
  TOOTH_DATA.forEach(([q, tn, x, w, h]) => {
    const ry = isUpper(q) ? 107 - h : 113
    const txc = x + w / 2, tyc = ry + h / 2 + 3.5
    const key = `${q}:${tn}`
    const active = selectedTeeth.value.has(key)
    const done = doneTeeth.has(key)
    const fill = active ? 'rgba(59,130,246,.52)' : done ? 'rgba(45,212,160,.25)' : (light ? 'rgba(241,245,249,.95)' : 'rgba(14,26,48,.85)')
    const stroke = active ? 'rgba(96,165,250,.95)' : done ? 'rgba(45,212,160,.5)' : (light ? 'rgba(59,130,246,.35)' : 'rgba(59,130,246,.32)')
    const sw = active ? '1.6' : '1'
    const textFill = active ? 'rgba(255,255,255,.98)' : done ? 'rgba(45,212,160,.9)' : (light ? 'rgba(30,58,138,.6)' : 'rgba(200,215,235,.62)')
    const filt = active ? ' filter="url(#tglow)"' : ''
    c += `<g class="tooth-g${active ? ' sel' : ''}" style="cursor:pointer" data-key="${key}">
      <rect x="${x}" y="${ry}" width="${w}" height="${h}" rx="3" ry="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${filt}/>
      <text x="${txc}" y="${tyc}" text-anchor="middle" fill="${textFill}" font-size="8" font-family="system-ui,sans-serif" font-weight="${active ? 700 : 400}">${tn}</text>
    </g>`
  })
  svgEl.value.innerHTML = c
  svgEl.value.querySelectorAll('.tooth-g').forEach(g => {
    g.addEventListener('click', () => {
      const key = g.dataset.key
      const [q2, tn2] = key.split(':')
      toggleTooth(q2, parseInt(tn2))
    })
  })
}

onMounted(() => { if (props.visible) nextTick(() => renderSVG()) })

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (svcWrap.value && !svcWrap.value.contains(e.target)) showSvcDrop.value = false
  })
}
</script>
