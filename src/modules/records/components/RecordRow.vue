<template>
  <div class="row-card p-3 flex justify-between items-start gap-2">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
        <p class="text-xs font-bold cursor-pointer" style="color:var(--gold)" @click.stop="$emit('goPatient', record.name)">{{ record.name || '' }}</p>
        <span v-if="debtBadgeText" :class="debtBadgeClass" class="badge-click" style="cursor:pointer" @click.stop="goDebt" :title="debtTooltip">{{ debtBadgeText }}</span>
        <span v-if="isDebtPay" class="b-paid-debt badge-click" style="cursor:pointer" @click.stop="goDebt">{{ record.debtPaymentType === 'full' ? 'سداد كلي' : 'دفعة جزئية' }}</span>
        <span v-if="record._s === 'p'" class="b-pros">تركيبات</span>
      </div>
      <p class="text-[9px] opacity-35">{{ record.date || '' }} | {{ record.service || '' }}</p>
      <div v-if="teethList.length" class="flex flex-wrap gap-0.5 mt-0.5">
        <span v-for="t in teethList" :key="t.q+':'+t.n" class="palmer-tooth" :class="'palmer-' + t.q">{{ t.n }}</span>
      </div>
      <!-- Prosthetic debt summary (always visible) -->
      <div v-if="record.isDebt && record._s === 'p' && linkedDebt" class="mt-1 flex gap-3 text-[9px]">
        <span class="opacity-40">قيمة العمل: <span class="n font-bold" style="color:var(--gold-l)">{{ n(Number(linkedDebt.totalAmount || linkedDebt.total || 0)) }}</span></span>
        <span class="opacity-40">المدفوع: <span class="n font-bold text-green-400">{{ n(Number(linkedDebt.paidAmount || 0)) }}</span></span>
        <span class="opacity-40">المتبقي: <span class="n font-bold text-red-400">{{ n(Number(linkedDebt.remaining || 0)) }}</span></span>
      </div>
      <!-- Prosthetic debt payment breakdown -->
      <div v-if="record.isDebtPayment && payBreakdown" class="mt-1 text-[10px]">
        <span v-if="payBreakdown.lab > 0 && payBreakdown.doc === 0 && payBreakdown.clin === 0" class="font-bold text-orange-400">← معمل: <span class="n">{{ n(payBreakdown.lab) }}</span></span>
        <template v-else>
          <span v-if="payBreakdown.lab > 0" class="font-bold text-orange-400">← معمل: <span class="n">{{ n(payBreakdown.lab) }}</span></span>
          <span v-if="payBreakdown.doc > 0" class="mx-1 text-green-400">| طبيب: <span class="n">{{ n(payBreakdown.doc) }}</span></span>
          <span v-if="payBreakdown.clin > 0" class="mx-1 text-blue-400">| عيادة: <span class="n">{{ n(payBreakdown.clin) }}</span></span>
        </template>
      </div>
      <!-- Debt inline info when clicked -->
      <div v-if="showDebtInfo && linkedDebt" class="mt-2 glass-sm p-2 rounded-lg space-y-1 text-[10px]" @click.stop>
        <div class="flex justify-between"><span class="opacity-50">الإجمالي:</span><span class="n font-bold">{{ n(Number(linkedDebt.totalAmount || linkedDebt.total || 0)) }} {{ currency }}</span></div>
        <div class="flex justify-between"><span class="opacity-50">المدفوع:</span><span class="n font-bold text-green-400">{{ n(Number(linkedDebt.paidAmount || 0)) }} {{ currency }}</span></div>
        <div class="flex justify-between"><span class="opacity-50">المتبقي:</span><span class="n font-bold text-red-400">{{ n(Number(linkedDebt.remaining || 0)) }} {{ currency }}</span></div>
        <div class="flex justify-between"><span class="opacity-50">الحالة:</span><span :class="linkedDebt.status === 'paid' ? 'text-green-400' : 'text-red-400'">{{ linkedDebt.status === 'paid' ? 'مسدد' : linkedDebt.status === 'partial' ? 'جزئي' : 'غير مسدد' }}</span></div>
        <div v-if="linkedDebt.installments?.length" class="border-t border-white/10 pt-1 mt-1">
          <p class="opacity-40 mb-0.5">الدفعات ({{ linkedDebt.installments.length }}):</p>
          <div v-for="(inst, i) in linkedDebt.installments" :key="i" class="flex justify-between opacity-60">
            <span>{{ inst.date }}</span><span class="n">{{ n(inst.amount) }} {{ currency }}</span>
          </div>
        </div>
        <button @click.stop="$emit('goDebts')" class="btn-o w-full py-1.5 text-[9px] mt-1">الذهاب لصفحة الديون</button>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0">
      <div class="text-left">
        <p class="text-xs font-bold" :class="payColor"><span class="n">{{ n(displayAmount) }}</span> <span class="text-[9px] opacity-40">{{ currency }}</span></p>
        <p v-if="record._fullAmount && record._fullAmount !== displayAmount" class="text-[8px] opacity-40">دفعة {{ n(record._fullAmount) }}</p>
        <p class="text-[9px] opacity-30">{{ record.payment || '' }}</p>
      </div>
      <!-- Phone -->
      <a v-if="record.phone" :href="'tel:' + record.phone" class="dc-contact-btn dc-call dc-sm" @click.stop title="اتصال">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
      </a>
      <!-- Edit Popup (modal overlay) -->
      <Teleport to="body">
        <div v-if="editingValue" class="edit-modal-backdrop" @click.self="editingValue = false">
          <div class="edit-modal-box" @click.stop>
            <p class="text-[11px] opacity-60 font-bold mb-2">تعديل {{ isProsEdit ? 'تركيبة' : 'سجل' }}</p>
            <div class="space-y-2">
              <div>
                <label class="text-[9px] opacity-40 mb-0.5 block">التاريخ</label>
                <input type="date" v-model="editDate" class="inp text-xs">
              </div>
              <div>
                <label class="text-[9px] opacity-40 mb-0.5 block">طريقة الدفع</label>
                <select v-model="editPayment" class="inp text-xs">
                  <option v-for="pm in paymentMethods" :key="pm" :value="pm">{{ pm }}</option>
                </select>
              </div>
              <div>
                <label class="text-[9px] opacity-40 mb-0.5 block">{{ isProsEdit ? 'الإجمالي' : 'القيمة' }} ({{ currency }})</label>
                <input type="number" v-model.number="newAmount" class="inp text-xs" :placeholder="String(displayAmount)" min="0" ref="editInput" @keyup.enter="confirmEditValue" @keyup.escape="editingValue = false">
              </div>
              <template v-if="isProsEdit">
                <div>
                  <label class="text-[9px] opacity-40 mb-0.5 block">قيمة المعمل ({{ currency }})</label>
                  <input type="number" v-model.number="editLabValue" class="inp text-xs" placeholder="0" min="0">
                </div>
                <div class="bg-white/5 rounded-lg p-2 space-y-0.5 text-[9px]">
                  <div class="flex justify-between"><span class="opacity-40">الصافي:</span><span class="n font-bold">{{ n(editNet) }} {{ currency }}</span></div>
                  <div class="flex justify-between"><span class="opacity-40">حصة الطبيب:</span><span class="n text-green-400">{{ n(editDocShare) }}</span></div>
                  <div class="flex justify-between"><span class="opacity-40">حصة العيادة:</span><span class="n text-blue-400">{{ n(editClinShare) }}</span></div>
                </div>
              </template>
            </div>
            <div class="flex gap-1.5 mt-3">
              <button @click="confirmEditValue" class="btn-g flex-1 py-1.5 text-[10px] font-bold">حفظ</button>
              <button @click="editingValue = false" class="btn-o px-2 py-1.5 text-[10px]">إلغاء</button>
            </div>
          </div>
        </div>
      </Teleport>
      <!-- Kebab Menu -->
      <div class="kebab-wrap">
        <button class="kebab-trigger" @click.stop="menuOpen = !menuOpen" title="خيارات">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
        <Transition name="kebab-fade">
          <div v-if="menuOpen" class="kebab-menu" @click.stop>
            <button class="kebab-item" @click="menuAction('edit-value')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              تعديل القيمة
            </button>
            <button v-if="linkedDebt" class="kebab-item kebab-blue" @click="menuAction('debt')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              عرض الدين
            </button>
            <div class="kebab-divider"></div>
            <button class="kebab-item kebab-red" @click="menuAction('delete')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              حذف السجل
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { formatNumber } from '@/utils/format'

const props = defineProps({
  record: { type: Object, required: true },
  debts: { type: Array, default: () => [] },
  currency: { type: String, default: 'د.ل' },
  paymentMethods: { type: Array, default: () => ['كاش', 'تحويل'] },
  doctorPct: { type: Number, default: 50 },
})

const emit = defineEmits(['edit', 'delete', 'goDebts', 'openPayment', 'goPatient', 'updateAmount'])

function n(v) { return formatNumber(v) }

const menuOpen = ref(false)
const showDebtInfo = ref(false)
const editingValue = ref(false)
const newAmount = ref(null)
const editDate = ref('')
const editPayment = ref('')
const editLabValue = ref(0)
const teethList = computed(() => {
  const rep = props.record.report
  if (!rep) return []
  const entries = Array.isArray(rep) ? rep : (rep.entries || [])
  const seen = new Set()
  const teeth = []
  entries.forEach(e => {
    if (e.teeth && Array.isArray(e.teeth)) {
      e.teeth.forEach(t => {
        const key = (t.q || 'UR') + ':' + t.n
        if (!seen.has(key)) { seen.add(key); teeth.push({ q: t.q || 'UR', n: t.n }) }
      })
    }
  })
  return teeth
})

const isDebtPay = computed(() => props.record.isDebtPayment && props.record.debtId)
const isProsEdit = computed(() => props.record._s === 'p' || props.record._t === 'p')
const displayAmount = computed(() => Number(props.record.amount || props.record.total || 0) || 0)
const editNet = computed(() => Math.max(0, (newAmount.value || 0) - (editLabValue.value || 0)))
const editDocShare = computed(() => editNet.value * (props.doctorPct / 100))
const editClinShare = computed(() => editNet.value * ((100 - props.doctorPct) / 100))

function menuAction(action) {
  menuOpen.value = false
  if (action === 'edit-value') {
    newAmount.value = displayAmount.value
    editDate.value = props.record.date || ''
    editPayment.value = props.record.payment || ''
    editLabValue.value = Number(props.record.labValue || 0) || 0
    editingValue.value = true
  } else if (action === 'delete') emit('delete', props.record.id, props.record._s)
  else if (action === 'debt') goDebt()
}

function confirmEditValue() {
  const amt = newAmount.value
  if (amt === null || amt === undefined || isNaN(amt) || amt < 0) return
  const changes = {}
  let hasChanges = false
  const origAmount = displayAmount.value
  if (amt !== origAmount) { changes.amount = amt; hasChanges = true }
  if (editDate.value && editDate.value !== props.record.date) { changes.date = editDate.value; hasChanges = true }
  if (editPayment.value && editPayment.value !== props.record.payment) { changes.payment = editPayment.value; hasChanges = true }
  if (isProsEdit.value) {
    const origLab = Number(props.record.labValue || 0) || 0
    if (editLabValue.value !== origLab) { changes.labValue = editLabValue.value; hasChanges = true }
  }
  if (hasChanges) {
    emit('updateAmount', props.record.id, amt, props.record._s, changes)
  }
  editingValue.value = false
}

function closeMenu() { menuOpen.value = false }
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

const linkedDebt = computed(() => {
  if (isDebtPay.value) return props.debts.find(d => d.id === props.record.debtId)
  if (props.record.isDebt) return props.debts.find(d => d.recordId === props.record.id || d.prostheticId === props.record.id)
  return null
})

function goDebt() {
  if (linkedDebt.value) {
    emit('openPayment', linkedDebt.value.id)
  } else {
    showDebtInfo.value = !showDebtInfo.value
  }
}

const payBreakdown = computed(() => {
  const r = props.record
  if (!r.isDebtPayment || !r.debtId) return null
  const dp = props.doctorPct || 50
  const full = Number(r._fullAmount || r.amount || 0)
  if (full <= 0) return null

  // Use stored breakdown fields if available (new format)
  if (r._labAmount !== undefined || r._docAmount !== undefined) {
    const lab = Number(r._labAmount || 0)
    const doc = Number(r._docAmount || 0)
    const clin = doc > 0 && dp > 0 ? doc * (100 - dp) / dp : 0
    return { full, lab: Math.round(lab * 100) / 100, doc: Math.round(doc * 100) / 100, clin: Math.round(clin * 100) / 100 }
  }

  // Fallback: compute from old format (amount = doctorProfit)
  const doc = Number(r.amount || 0)
  const debt = linkedDebt.value
  const isPros = debt && debt.type === 'prosthetic'
  if (!isPros) return { full, lab: 0, doc, clin: 0 }
  if (dp <= 0) return null
  const toProfit = doc * 100 / dp
  const lab = Math.max(0, full - toProfit)
  const clin = doc * (100 - dp) / dp
  return { full, lab: Math.round(lab * 100) / 100, doc, clin: Math.round(clin * 100) / 100 }
})

const payColor = computed(() => {
  if (props.record.isDebtPayment && payBreakdown.value) {
    const b = payBreakdown.value
    if (b.lab > 0 && b.doc === 0 && b.clin === 0) return 'text-orange-400'
  }
  if (props.record.payment === 'كاش') return 'text-green-400'
  if (props.record.payment === 'دين') return 'text-red-400'
  return 'text-blue-400'
})

const debtBadgeText = computed(() => {
  if (!props.record.isDebt) return ''
  return linkedDebt.value?.status === 'paid' ? '✓ مسدد' : 'دين'
})

const debtBadgeClass = computed(() => {
  if (!props.record.isDebt) return ''
  return linkedDebt.value?.status === 'paid' ? 'b-debt-settled' : 'b-debt'
})

const debtTooltip = computed(() => {
  if (!linkedDebt.value) return ''
  return `اضغط لعرض تفاصيل الدين — المتبقي: ${n(linkedDebt.value.remaining || 0)} ${props.currency}`
})
</script>

<style scoped>
.edit-modal-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: fadeIn .15s ease;
}
.edit-modal-box {
  background: var(--card-bg, #1a1a2e);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 16px;
  width: 100%; max-width: 300px;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  animation: scaleIn .15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes scaleIn { from { transform: scale(.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
:global(body.light) .edit-modal-backdrop { background: rgba(236,242,249,.96); }
:global(body.light) .edit-modal-box {
  background: rgba(255,255,255,.97);
  border-color: rgba(0,0,0,.1);
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  color: #1a2a3a;
}
.palmer-tooth {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  font-size: 9px;
  font-weight: 800;
  color: rgba(96,165,250,.9);
  border-color: rgba(96,165,250,.75);
  border-style: solid;
  border-width: 0;
  padding: 1px 3px;
  line-height: 1;
}
.palmer-UR { border-bottom-width: 1.5px; border-right-width: 1.5px; }
.palmer-UL { border-bottom-width: 1.5px; border-left-width: 1.5px; }
.palmer-LR { border-top-width: 1.5px; border-right-width: 1.5px; }
.palmer-LL { border-top-width: 1.5px; border-left-width: 1.5px; }
:global(body.light) .palmer-tooth {
  color: #1d4ed8;
  border-color: rgba(29,78,216,.75);
}
</style>
