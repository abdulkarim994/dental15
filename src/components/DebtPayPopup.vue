<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-ol" style="display:flex;align-items:flex-start;justify-content:center;padding-top:24px" @click.self="close">
      <div class="glass p-5 w-full max-w-sm mx-3 space-y-4 rounded-2xl max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="flex justify-between items-center">
          <h3 class="font-bold text-sm" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
            تفاصيل الدين
          </h3>
          <button @click="close" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
        </div>

        <template v-if="debt">
          <!-- Debt Info -->
          <div class="glass-sm p-3 space-y-2 rounded-xl">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-bold" style="color:var(--gold-l)">{{ debt.name }}</span>
              <span :class="debt.status === 'paid' ? 'b-debt-settled' : 'b-unpaid'" class="text-[9px] px-2 py-0.5 rounded-full">{{ statusLabel }}</span>
            </div>
            <div v-if="debt.phone" class="flex justify-between items-center">
              <span class="opacity-50 text-xs">الهاتف:</span>
              <div class="flex items-center gap-2">
                <a :href="'tel:' + debt.phone" class="text-blue-400 text-xs">{{ debt.phone }}</a>
                <a v-if="waPhone" :href="waLink" target="_blank" rel="noopener" class="whatsapp-btn" style="font-size:8px;padding:2px 7px">واتس</a>
              </div>
            </div>
            <div v-if="debt.service" class="flex justify-between"><span class="opacity-50 text-xs">الخدمة:</span><span class="text-xs font-bold" style="color:var(--gold-l)">{{ debt.service }}</span></div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">العيادة:</span><span class="text-xs">{{ debt.clinic || '—' }}</span></div>
            <div class="flex justify-between"><span class="opacity-50 text-xs">التاريخ:</span><span class="text-xs">{{ debt.date || '—' }}</span></div>
            <div v-if="debt.notes" class="flex justify-between"><span class="opacity-50 text-xs">ملاحظات:</span><span class="text-xs opacity-60">{{ debt.notes }}</span></div>
            <div class="border-t border-white/10 pt-2 space-y-1.5">
              <div class="flex justify-between"><span class="opacity-50 text-xs">المبلغ الكلي:</span><span class="n font-bold text-yellow-400">{{ n(totalAmt) }} {{ currency }}</span></div>
              <div class="flex justify-between"><span class="opacity-50 text-xs">المدفوع:</span><span class="n font-bold text-green-400">{{ n(debt.paidAmount || 0) }} {{ currency }}</span></div>
              <div class="flex justify-between"><span class="opacity-50 text-xs">المتبقي:</span><span class="n font-bold text-red-400">{{ n(debt.remaining || 0) }} {{ currency }}</span></div>
            </div>
            <!-- Progress -->
            <div class="pt-1">
              <div class="w-full h-2 rounded-full overflow-hidden prog-track" style="background:rgba(255,255,255,.1)">
                <div class="h-full rounded-full transition-all" :style="{ width: payPct + '%', background: payPct >= 100 ? 'var(--green)' : 'var(--gold)' }"></div>
              </div>
              <p class="text-[9px] opacity-40 mt-1 text-center"><span class="n">{{ payPct }}%</span> مسدد</p>
            </div>
          </div>

          <!-- Installments List -->
          <div v-if="debt.installments?.length" class="space-y-2">
            <span class="sec-h text-[10px]">الدفعات ({{ debt.installments.length }})</span>
            <div v-for="(inst, i) in debt.installments" :key="inst.id || i" class="row-card p-2.5 flex justify-between items-center">
              <div>
                <p class="text-xs font-bold text-green-400"><span class="n">{{ n(inst.amount) }}</span> {{ currency }}</p>
                <p class="text-[9px] opacity-35">{{ inst.date }}</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-left">
                  <span class="text-[9px] px-1.5 py-0.5 rounded-full" style="background:rgba(59,130,246,.12);color:var(--gold-l)">{{ inst.payment || '—' }}</span>
                  <p class="text-[10px] opacity-40 mt-0.5 text-center">#{{ i + 1 }}</p>
                </div>
                <button @click="cancelInstallment(i)" class="glass-sm w-7 h-7 flex items-center justify-center rounded-lg" style="color:#f87171;flex-shrink:0" title="إلغاء الدفعة">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-3 opacity-30 text-xs">لا توجد دفعات مسجلة</div>

          <!-- Add Payment Button -->
          <button v-if="debt.status !== 'paid'" @click="showInstForm = true" class="btn-g w-full py-3 text-xs font-bold">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="9.5"/><path d="M12 8v8M8 12h8"/></svg>
            إضافة دفعة
          </button>

          <!-- Installment Form (inline sub-form) -->
          <div v-if="showInstForm && debt.status !== 'paid'" class="glass-sm p-3 space-y-3 rounded-xl">
            <p class="font-bold text-xs" style="color:var(--gold)">دفعة جديدة</p>
            <div class="space-y-1.5">
              <div class="flex justify-between"><span class="opacity-50 text-xs">المتبقي:</span><span class="n font-black text-red-400">{{ n(debt.remaining || 0) }} {{ currency }}</span></div>
              <template v-if="debt.type === 'prosthetic' && labRem > 0">
                <div class="flex justify-between"><span class="opacity-50 text-xs">المعمل المتبقي:</span><span class="n text-orange-400">{{ n(labRem) }} {{ currency }}</span></div>
                <p class="text-[9px] text-orange-300">⚠ تُخصم أولاً من المعمل ثم الربح</p>
              </template>
            </div>
            <input type="number" v-model.number="instAmt" class="inp" placeholder="قيمة الدفعة" min="0" @input="previewInst">
            <input type="date" v-model="instDate" class="inp text-xs">
            <select v-model="instPay" class="inp text-xs">
              <option v-for="p in payments" :key="p">{{ p }}</option>
            </select>
            <!-- Preview -->
            <div v-if="instPreview" class="glass-sm p-2.5 space-y-1 rounded-xl">
              <p class="opacity-50 font-bold text-[10px] mb-0.5">معاينة:</p>
              <template v-if="debt.type === 'prosthetic'">
                <div v-if="instPreview.toLab > 0" class="flex justify-between"><span class="opacity-50 text-[10px]">للمعمل:</span><span class="n text-orange-400 text-[10px]">{{ n(instPreview.toLab) }} {{ currency }}</span></div>
                <template v-if="instPreview.toProfit > 0">
                  <div class="flex justify-between"><span class="opacity-50 text-[10px]">ربح الطبيب ({{ doctorPct }}%):</span><span class="n text-green-400 text-[10px]">{{ n(instPreview.docShare) }} {{ currency }}</span></div>
                  <div class="flex justify-between"><span class="opacity-50 text-[10px]">ربح العيادة ({{ 100 - doctorPct }}%):</span><span class="n text-blue-400 text-[10px]">{{ n(instPreview.clinShare) }} {{ currency }}</span></div>
                </template>
                <p v-else class="text-orange-300 text-[10px]">كل الدفعة للمعمل فقط</p>
              </template>
              <template v-else>
                <div class="flex justify-between"><span class="opacity-50 text-[10px]">قيمة الدفعة:</span><span class="n text-green-400 text-[10px]">{{ n(instAmt) }} {{ currency }}</span></div>
              </template>
            </div>
            <div class="flex gap-2">
              <button @click="confirmInst" class="btn-g flex-1 py-2.5 text-xs font-bold">تأكيد الدفعة</button>
              <button @click="showInstForm = false" class="btn-o px-3 py-2.5 text-xs">إلغاء</button>
            </div>
          </div>
        </template>
        <div v-else class="text-center py-6 opacity-30 text-xs">لم يتم العثور على سجل الدين</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { formatNumber, getCurrentDate } from '@/utils/format'
import { markMonthDirty, markDebtsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import { generateId } from '@/utils/uid'

const props = defineProps({
  visible: { type: Boolean, default: false },
  debtId: { type: [Number, String, null], default: null },
})
const emit = defineEmits(['close', 'updated'])
const app = useAppStore()
const auth = useAuthStore()
const { toast } = useToast()

const showInstForm = ref(false)
const instAmt = ref(null)
const instDate = ref(getCurrentDate())
const instPay = ref('')
const instPreview = ref(null)

function n(v) { return formatNumber(v) }

const debt = computed(() => app.debts.find(d => d.id === props.debtId))
const currency = computed(() => app.currency)
const payments = computed(() => app.payments)
const doctorPct = computed(() => app.config.doctorPct || 50)
const totalAmt = computed(() => Number(debt.value?.totalAmount || debt.value?.total || 0))
const payPct = computed(() => totalAmt.value > 0 ? Math.min(100, Math.round(((Number(debt.value?.paidAmount) || 0) / totalAmt.value) * 100)) : 0)
const labRem = computed(() => {
  const d = debt.value
  if (!d || d.type !== 'prosthetic') return 0
  return Math.max(0, (Number(d.labValue) || 0) - (Number(d.labPaid) || 0))
})
const statusLabel = computed(() => {
  const s = debt.value?.status
  return s === 'paid' ? 'مسدد بالكامل' : s === 'partial' ? 'جزئي' : 'غير مسدد'
})
const waPhone = computed(() => {
  const p = debt.value?.phone
  return p ? (p + '').replace(/[^0-9]/g, '') : ''
})
const waLink = computed(() => {
  if (!waPhone.value) return '#'
  const msg = encodeURIComponent(`السلام عليكم ${debt.value?.name || ''}, تذكير بموعد سداد الدين المتبقي: ${n(debt.value?.remaining || 0)} ${currency.value}`)
  return `https://wa.me/${waPhone.value}?text=${msg}`
})

watch(() => props.visible, (v) => {
  if (v) {
    showInstForm.value = false
    instAmt.value = null
    instDate.value = getCurrentDate()
    instPay.value = payments.value[0] || 'كاش'
    instPreview.value = null
  }
})

function close() { emit('close') }

function previewInst() {
  const d = debt.value
  if (!d || !instAmt.value || instAmt.value <= 0) { instPreview.value = null; return }
  const ip = d.type === 'prosthetic'
  const lr = ip ? labRem.value : 0
  const toLab = ip ? Math.min(instAmt.value, lr) : 0
  const toProfit = instAmt.value - toLab
  const dp = doctorPct.value
  instPreview.value = { toLab, toProfit, docShare: toProfit * (dp / 100), clinShare: toProfit * ((100 - dp) / 100) }
}

function confirmInst() {
  const dIdx = app.debts.findIndex(d => d.id === props.debtId)
  if (dIdx < 0) return
  const debtObj = { ...app.debts[dIdx] }
  const amt = instAmt.value
  const date = instDate.value
  const pay = instPay.value
  if (isNaN(amt) || amt <= 0) { toast('يرجى إدخال قيمة دفعة صحيحة'); return }
  if (!date) { toast('يرجى اختيار تاريخ الدفعة'); return }
  if (amt > (Number(debtObj.remaining) || 0) + 0.01) { toast('الدفعة أكبر من المتبقي (' + n(debtObj.remaining || 0) + ' ' + currency.value + ')'); return }

  const ip = debtObj.type === 'prosthetic'
  const lr = ip ? Math.max(0, (Number(debtObj.labValue) || 0) - (Number(debtObj.labPaid) || 0)) : 0
  const toLab = ip ? Math.min(amt, lr) : 0
  const toProfit = amt - toLab
  const dp = doctorPct.value

  const recId = generateId()
  debtObj.installments = debtObj.installments || []
  debtObj.installments.push({ id: generateId(), amount: amt, date, payment: pay, recordId: recId })
  debtObj.paidAmount = (Number(debtObj.paidAmount) || 0) + amt
  debtObj.remaining = Math.max(0, (Number(debtObj.remaining) || 0) - amt)
  const isFull = debtObj.remaining <= 0.01

  if (ip) {
    debtObj.labPaid = (Number(debtObj.labPaid) || 0) + toLab
    const dProfit = toProfit > 0 ? toProfit * (dp / 100) : 0
    if (dProfit > 0) debtObj.doctorEarned = (Number(debtObj.doctorEarned) || 0) + dProfit
    const svcLabel = debtObj.service ? 'دفعة تركيبات — ' + debtObj.service : 'تركيبات (دفعة دين)'
    app.records = [...app.records, {
      id: recId, uid: auth.uid, date, name: debtObj.name,
      amount: amt, _fullAmount: amt, _labAmount: toLab, _docAmount: dProfit,
      clinic: debtObj.clinic, service: svcLabel, payment: pay,
      isDebt: false, isPros: false, isDebtPayment: true, debtId: debtObj.id,
      debtPaymentType: isFull ? 'full' : 'partial', _mod: Date.now(), _t: 'r',
    }]
  } else {
    const svcLabel = debtObj.service ? 'دفعة دين — ' + debtObj.service : 'دفعة دين'
    app.records = [...app.records, {
      id: recId, uid: auth.uid, date, name: debtObj.name,
      amount: amt, clinic: debtObj.clinic, service: svcLabel, payment: pay,
      isDebt: false, isPros: false, isDebtPayment: true, debtId: debtObj.id,
      debtPaymentType: isFull ? 'full' : 'partial', _mod: Date.now(), _t: 'r',
    }]
  }

  if (isFull) { debtObj.status = 'paid'; debtObj.remaining = 0 }
  else { debtObj.status = 'partial' }
  debtObj._mod = Date.now()
  const updDebts = [...app.debts]
  updDebts[dIdx] = { ...debtObj }
  app.debts = updDebts
  markMonthDirty(date)
  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast(isFull ? 'تم سداد الدين بالكامل!' : 'تم تسجيل الدفعة')
  showInstForm.value = false
  instAmt.value = null
  instPreview.value = null
  emit('updated')
}

const cancelConfirmIdx = ref(-1)
function cancelInstallment(idx) {
  if (cancelConfirmIdx.value === idx) {
    doCancelInstallment(idx)
    cancelConfirmIdx.value = -1
  } else {
    cancelConfirmIdx.value = idx
    toast('اضغط مرة ثانية للتأكيد')
    setTimeout(() => { cancelConfirmIdx.value = -1 }, 3000)
  }
}

function doCancelInstallment(idx) {
  const dIdx = app.debts.findIndex(d => d.id === props.debtId)
  if (dIdx < 0) return
  const debtObj = { ...app.debts[dIdx] }
  if (!debtObj.installments || !debtObj.installments[idx]) return
  const inst = debtObj.installments[idx]
  const instAmt = Number(inst.amount || 0)
  const ip = debtObj.type === 'prosthetic'
  const dp = doctorPct.value
  const labVal = Number(debtObj.labValue || 0)

  debtObj.paidAmount = Math.max(0, (Number(debtObj.paidAmount) || 0) - instAmt)
  const totalDebtAmt = Number(debtObj.totalAmount || debtObj.total || 0) || 0
  debtObj.remaining = Math.max(0, totalDebtAmt - debtObj.paidAmount)

  if (debtObj.remaining <= 0.01) { debtObj.status = 'paid'; debtObj.remaining = 0 }
  else if (debtObj.paidAmount > 0.01) debtObj.status = 'partial'
  else debtObj.status = 'unpaid'

  if (ip) {
    debtObj.labPaid = Math.min(labVal, debtObj.paidAmount)
    const profitPortion = Math.max(0, debtObj.paidAmount - debtObj.labPaid)
    debtObj.doctorEarned = profitPortion * (dp / 100)
  }

  debtObj.installments = debtObj.installments.filter((_, j) => j !== idx)
  debtObj._mod = Date.now()

  const updDebts = [...app.debts]
  updDebts[dIdx] = debtObj
  app.debts = updDebts

  const matchRec = app.records.find(r =>
    r.isDebtPayment && r.debtId === debtObj.id &&
    (inst.recordId ? r.id === inst.recordId : r.date === inst.date)
  )
  if (matchRec) {
    markMonthDirty(matchRec.date)
    app.trackDeletion(matchRec.id)
    app.deleteRecord(matchRec.id)
    enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: matchRec.id, data: { id: matchRec.id } }).catch(() => {})
  }

  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم إلغاء الدفعة')
  emit('updated')
}
</script>
