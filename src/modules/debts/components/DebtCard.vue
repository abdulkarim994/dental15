<template>
  <div class="glass p-4 space-y-3 rounded-2xl" :style="{ borderColor: isPaid ? 'rgba(45,212,160,.15)' : 'rgba(255,68,85,.15)' }">
    <!-- Header -->
    <div class="flex justify-between items-start">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap mb-1">
          <p class="text-sm font-black cursor-pointer" style="color:var(--gold)" @click="$emit('go-patient', debt.name)">{{ debt.name || '' }}</p>
          <span :class="statusClass">{{ statusText }}</span>
          <span v-if="debt.type === 'prosthetic'" class="b-pros">تركيبات</span>
        </div>
        <p v-if="debt.service" class="text-[10px] font-semibold" style="color:var(--gold-l);opacity:.7">{{ debt.service }}</p>
        <p class="text-[9px] opacity-35">{{ debt.date || '' }} | {{ debt.clinic || '' }}</p>
      </div>
      <!-- Contact Icons + Kebab Menu -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <a v-if="waPhone" :href="'tel:' + waPhone" class="dc-contact-btn dc-call dc-sm" @click.stop title="اتصال">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
        </a>
        <a v-if="waPhone" :href="smsLink" class="dc-contact-btn dc-sms dc-sm" @click.stop title="SMS">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </a>
        <a v-if="waPhone" :href="debtWaLink" target="_blank" rel="noopener" class="dc-contact-btn dc-wa dc-sm" @click.stop title="واتساب">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.67-1.388A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.94 9.94 0 01-5.38-1.572l-.386-.232-2.768.823.74-2.726-.254-.404A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>
      <div class="kebab-wrap">
        <button class="kebab-trigger" @click.stop="menuOpen = !menuOpen" title="خيارات">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
        <Transition name="kebab-fade">
          <div v-if="menuOpen" class="kebab-menu" @click.stop>
            <button class="kebab-item" @click="menuAction('edit')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              تعديل بيانات الدين
            </button>
            <button v-if="!isPaid" class="kebab-item kebab-green" @click="menuAction('forgive')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              مسامحة
            </button>
            <div class="kebab-divider"></div>
            <button class="kebab-item kebab-red" @click="menuAction('delete')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              حذف الدين
            </button>
          </div>
        </Transition>
      </div>
      </div>
    </div>

    <!-- Amount Info -->
    <div class="grid grid-cols-3 gap-2 text-center">
      <div><p class="text-[9px] opacity-40">الإجمالي</p><p class="text-xs font-bold text-yellow-400"><span class="n">{{ n(totalAmt) }}</span></p></div>
      <div><p class="text-[9px] opacity-40">المدفوع</p><p class="text-xs font-bold text-green-400"><span class="n">{{ n(debt.paidAmount || 0) }}</span></p></div>
      <div><p class="text-[9px] opacity-40">المتبقي</p><p class="text-xs font-bold text-red-400"><span class="n">{{ n(debt.remaining || 0) }}</span></p></div>
    </div>

    <!-- Progress Bar -->
    <div>
      <div class="w-full h-2 rounded-full overflow-hidden prog-track" style="background:rgba(255,255,255,.1)">
        <div class="h-full rounded-full transition-all" :style="{ width: pct + '%', background: isPaid ? 'var(--green)' : 'var(--gold)' }"></div>
      </div>
      <p class="text-[9px] opacity-35 mt-1 text-center"><span class="n">{{ pct }}%</span> مسدد</p>
    </div>

    <!-- Actions — only primary buttons visible -->
    <div class="flex gap-2 pt-1" v-if="!isPaid">
      <button @click="$emit('pay', debt.id)" class="btn-g flex-1 py-2.5 text-xs font-bold">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
        تسجيل دفعة
      </button>
      <button @click="$emit('view-payments', debt.id)" class="btn-o px-3 py-2.5 text-xs">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        الدفعات
      </button>
    </div>
    <div v-else class="flex gap-2 pt-1">
      <button @click="$emit('view-payments', debt.id)" class="btn-o w-full py-2.5 text-xs">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        عرض سجل الدفعات
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { formatNumber } from '@/utils/format'
import { useAppStore } from '@/stores/app.store'

const props = defineProps({
  debt: { type: Object, required: true },
  currency: { type: String, default: 'د.ل' },
  doctorPct: { type: Number, default: 50 },
})

const emit = defineEmits(['pay', 'edit', 'delete', 'forgive', 'view-payments', 'go-patient'])

const app = useAppStore()
function n(v) { return formatNumber(v) }

const menuOpen = ref(false)

function menuAction(action) {
  menuOpen.value = false
  if (action === 'edit') emit('edit', props.debt.id)
  else if (action === 'delete') emit('delete', props.debt.id)
  else if (action === 'forgive') emit('forgive', props.debt.id)
}

function closeMenu() { menuOpen.value = false }
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

const totalAmt = computed(() => Number(props.debt.totalAmount || props.debt.total || 0))
const isPaid = computed(() => props.debt.status === 'paid')

const pct = computed(() => {
  const total = totalAmt.value
  return total > 0 ? Math.min(100, Math.round(((Number(props.debt.paidAmount) || 0) / total) * 100)) : 0
})

const statusText = computed(() => {
  if (isPaid.value) return 'مسدد'
  if (props.debt.status === 'partial') return 'جزئي'
  return 'غير مسدد'
})

const statusClass = computed(() => {
  if (isPaid.value) return 'b-debt-settled'
  if (props.debt.status === 'partial') return 'b-partial'
  return 'b-unpaid'
})

const waPhone = computed(() => {
  const p = (props.debt.phone || '').replace(/[^0-9]/g, '')
  return p || ''
})

const debtWaLink = computed(() => {
  if (!waPhone.value) return '#'
  const center = app.centerName || ''
  const cur = props.currency
  const remaining = n(props.debt.remaining || 0)
  const msg = encodeURIComponent(
    `\u{1F3E5} *${center}*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\u{1F4CB} *تذكير بالمبلغ المتبقي*\n\nالسلام عليكم\nعزيزنا/عزيزتنا *${props.debt.name || ''}*\n\nنود تذكيركم بالمبلغ المتبقي:\n\u{1F4B0} المبلغ المتبقي: *${remaining} ${cur}*\n\nنرجو التواصل معنا لتسوية المبلغ.\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n*${center}* \u{1F9B7}`
  )
  return `https://wa.me/${waPhone.value}?text=${msg}`
})

const smsLink = computed(() => {
  if (!waPhone.value) return '#'
  const center = app.centerName || ''
  const cur = props.currency
  const remaining = n(props.debt.remaining || 0)
  const body = encodeURIComponent(`${center}: تذكير بالمبلغ المتبقي ${props.debt.name || ''} - ${remaining} ${cur}. نرجو التواصل لتسوية المبلغ.`)
  return `sms:${waPhone.value}?body=${body}`
})
</script>
