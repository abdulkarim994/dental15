<template>
  <div class="space-y-4">
    <!-- Back + header -->
    <div class="flex items-center justify-between gap-2">
      <button class="glass-sm w-10 h-10 flex items-center justify-center" @click="goBack">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2 class="font-bold text-sm flex-1 text-center truncate" style="color:var(--gold)">
        {{ queueStore.selectedClinic }} — {{ formattedDate }}
      </h2>
      <button class="glass-sm w-10 h-10 flex items-center justify-center" @click="showDatePicker = true" title="تغيير التاريخ">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      </button>
    </div>

    <!-- Date picker overlay -->
    <div v-if="showDatePicker" class="glass p-3 rounded-2xl flex items-center gap-2">
      <input type="date" v-model="queueStore.selectedDate" class="inp text-xs flex-1">
      <button class="btn-g px-3 py-2 text-xs" @click="showDatePicker = false">تم</button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-3 gap-2">
      <div class="glass p-3 rounded-xl text-center">
        <div class="text-2xl font-black" style="color:var(--gold)">{{ queueStore.currentCount }}</div>
        <div class="text-[9px] opacity-50 mt-1">الموجودون حالياً</div>
      </div>
      <div class="glass p-3 rounded-xl text-center">
        <div class="text-2xl font-black" style="color:var(--green)">{{ queueStore.completedCount }}</div>
        <div class="text-[9px] opacity-50 mt-1">تم علاجهم</div>
      </div>
      <div class="glass p-3 rounded-xl text-center">
        <div class="text-2xl font-black" style="color:var(--orange)">{{ queueStore.remainingCount }}</div>
        <div class="text-[9px] opacity-50 mt-1">المتبقون</div>
      </div>
    </div>

    <!-- Period tabs -->
    <div class="flex gap-2">
      <button
        v-for="p in periods"
        :key="p.id"
        class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
        :class="queueStore.selectedPeriod === p.id ? 'btn-g' : 'btn-o'"
        @click="queueStore.selectedPeriod = p.id"
      >{{ p.label }}</button>
    </div>

    <!-- Add patient button -->
    <button class="btn-g w-full py-3 text-sm font-bold" style="border-radius:14px" @click="openAddModal">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline;vertical-align:-2px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      إضافة مريض
    </button>

    <!-- Queue table -->
    <div v-if="queueStore.filteredEntries.length" class="space-y-2">
      <div
        v-for="(entry, idx) in queueStore.filteredEntries"
        :key="entry.id"
        class="glass rounded-2xl overflow-hidden transition-all duration-200"
        :class="draggedId === entry.id ? 'opacity-50 scale-95' : ''"
        :style="{ borderRight: '4px solid ' + (entry.status === 'new' ? 'rgba(59,130,246,.6)' : 'rgba(45,212,160,.6)') }"
        :draggable="true"
        @dragstart="onDragStart($event, entry.id)"
        @dragover.prevent="onDragOver($event, idx)"
        @dragend="onDragEnd"
        @touchstart.passive="onTouchStart($event, entry.id, idx)"
        @touchmove.prevent="onTouchMove($event)"
        @touchend="onTouchEnd"
      >
        <div class="p-3">
          <!-- Row 1: Number + Name + Status -->
          <div class="flex items-center gap-3 mb-2">
            <span
              class="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0"
              :style="{ background: entry.status === 'new' ? 'rgba(59,130,246,.12)' : 'rgba(45,212,160,.12)', color: entry.status === 'new' ? 'var(--gold)' : 'var(--green)' }"
            >{{ entry.queue_order }}</span>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm truncate">{{ entry.patient_name }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span
                  class="text-[9px] px-2 py-0.5 rounded-full font-bold"
                  :style="{ background: entry.status === 'new' ? 'rgba(59,130,246,.12)' : 'rgba(45,212,160,.12)', color: entry.status === 'new' ? '#60A5FA' : '#2dd4a0' }"
                >{{ entry.status === 'new' ? 'جديد' : 'مراجعة' }}</span>
                <span class="text-[9px] opacity-40">{{ entry.expected_time }}</span>
              </div>
            </div>
            <!-- Notes icon -->
            <button v-if="entry.notes" class="glass-sm w-8 h-8 flex items-center justify-center flex-shrink-0" @click="showNotes(entry)" title="ملاحظات">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </button>
          </div>

          <!-- Row 2: Phone actions + control buttons -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1">
              <!-- Call -->
              <a v-if="entry.phone" :href="'tel:' + entry.phone" class="glass-sm w-8 h-8 flex items-center justify-center" title="اتصال">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              </a>
              <!-- WhatsApp -->
              <a v-if="entry.phone" :href="waLink(entry)" target="_blank" class="glass-sm w-8 h-8 flex items-center justify-center" title="واتساب">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <!-- Send ready message -->
              <button v-if="entry.phone" class="glass-sm w-8 h-8 flex items-center justify-center" @click="sendReadyMsg(entry)" title="إرسال رسالة جاهزة">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <div class="flex items-center gap-1">
              <!-- Edit -->
              <button class="glass-sm w-8 h-8 flex items-center justify-center" @click="openEditModal(entry)" title="تعديل">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gold-l)" stroke-width="2" stroke-linecap="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <!-- Skip -->
              <button class="glass-sm w-8 h-8 flex items-center justify-center" @click="skipPatient(entry.id)" title="تخطي">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>
              <!-- Complete -->
              <button class="glass-sm w-8 h-8 flex items-center justify-center" @click="completePatient(entry.id)" title="تم الدخول" style="background:rgba(45,212,160,.1);border-color:rgba(45,212,160,.3)">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#2dd4a0" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <!-- Delete -->
              <button class="glass-sm w-8 h-8 flex items-center justify-center" @click="deletePatient(entry.id)" title="حذف" style="background:rgba(255,68,85,.06);border-color:rgba(255,68,85,.2)">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ff4455" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="glass p-8 rounded-2xl text-center">
      <div class="text-3xl mb-2 opacity-20">📋</div>
      <p class="text-xs opacity-40">لا يوجد مرضى في قائمة الانتظار</p>
    </div>

    <!-- Add / Edit Patient Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-ol" style="display:flex;align-items:center;justify-content:center" @click.self="showModal = false">
        <div class="glass p-5 rounded-2xl w-full max-w-md mx-4 space-y-3" @click.stop>
          <h3 class="font-bold text-sm" style="color:var(--gold)">{{ editingEntry ? 'تعديل بيانات المريض' : 'إضافة مريض جديد' }}</h3>
          <div>
            <label class="text-[9px] opacity-40 block mb-1">اسم المريض *</label>
            <input type="text" v-model="form.patient_name" class="inp text-xs w-full" placeholder="اسم المريض" ref="nameInput">
          </div>
          <div>
            <label class="text-[9px] opacity-40 block mb-1">رقم الهاتف</label>
            <input type="tel" v-model="form.phone" class="inp text-xs w-full" placeholder="رقم الهاتف" dir="ltr">
          </div>
          <div>
            <label class="text-[9px] opacity-40 block mb-1">الحالة</label>
            <div class="flex gap-2">
              <button
                class="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
                :class="form.status === 'new' ? 'btn-g' : 'btn-o'"
                @click="form.status = 'new'"
              >جديد</button>
              <button
                class="flex-1 py-2 text-xs font-bold rounded-xl transition-all"
                :class="form.status === 'review' ? 'btn-g' : 'btn-o'"
                style="--gold-g:linear-gradient(135deg,#34d399,#10b981,#059669)"
                @click="form.status = 'review'"
              >مراجعة</button>
            </div>
          </div>
          <div>
            <label class="text-[9px] opacity-40 block mb-1">الوقت المتوقع</label>
            <input type="text" v-model="form.expected_time" class="inp text-xs w-full" placeholder="مثال: 1:30 PM" dir="ltr">
          </div>
          <div>
            <label class="text-[9px] opacity-40 block mb-1">ملاحظات</label>
            <textarea v-model="form.notes" class="inp text-xs w-full resize-none" rows="2" placeholder="ملاحظات إضافية..."></textarea>
          </div>
          <div class="flex gap-2 pt-1">
            <button @click="savePatient" class="btn-g flex-1 py-2.5 text-xs font-bold">{{ editingEntry ? 'حفظ التعديلات' : 'إضافة' }}</button>
            <button @click="showModal = false" class="btn-o px-4 py-2.5 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Notes popup -->
    <Teleport to="body">
      <div v-if="notesPopup" class="modal-ol" style="display:flex;align-items:center;justify-content:center" @click.self="notesPopup = null">
        <div class="glass p-5 rounded-2xl w-full max-w-sm mx-4" @click.stop>
          <h3 class="font-bold text-sm mb-3" style="color:var(--gold)">ملاحظات — {{ notesPopup.patient_name }}</h3>
          <p class="text-xs opacity-80 whitespace-pre-wrap leading-relaxed">{{ notesPopup.notes }}</p>
          <button class="btn-o w-full py-2 text-xs mt-4" @click="notesPopup = null">إغلاق</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueStore } from '@/stores/queue.store'
import { useAuthStore } from '@/stores/auth.store'
import { useConfigStore } from '@/stores/config.store'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const queueStore = useQueueStore()
const authStore = useAuthStore()
const configStore = useConfigStore()
const { toast } = useToast()

const periods = [
  { id: 'morning', label: 'صباحي' },
  { id: 'evening', label: 'مسائي' },
]

const showDatePicker = ref(false)
const showModal = ref(false)
const editingEntry = ref(null)
const notesPopup = ref(null)
const nameInput = ref(null)

const form = ref({
  patient_name: '',
  phone: '',
  status: 'new',
  notes: '',
  expected_time: '',
})

const formattedDate = computed(() => {
  const d = queueStore.selectedDate
  if (!d) return ''
  const parts = d.split('-')
  return `${parts[2]}/${parts[1]}/${parts[0]}`
})

// ─── Drag & Drop ───
const draggedId = ref(null)
const dragOverIdx = ref(-1)

function onDragStart(e, id) {
  draggedId.value = id
  e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e, idx) {
  dragOverIdx.value = idx
}

function onDragEnd() {
  if (draggedId.value && dragOverIdx.value >= 0) {
    const items = [...queueStore.filteredEntries]
    const fromIdx = items.findIndex((e) => e.id === draggedId.value)
    if (fromIdx >= 0 && fromIdx !== dragOverIdx.value) {
      const [moved] = items.splice(fromIdx, 1)
      items.splice(dragOverIdx.value, 0, moved)
      queueStore.reorderEntries(items.map((e) => e.id))
      _persist()
    }
  }
  draggedId.value = null
  dragOverIdx.value = -1
}

// ─── Touch drag ───
let touchStartY = 0
let touchStartIdx = 0
let touchMoved = false

function onTouchStart(e, id, idx) {
  // Long press detection for drag
  touchStartY = e.touches[0].clientY
  touchStartIdx = idx
  touchMoved = false
  draggedId.value = null
}

function onTouchMove(e) {
  const dy = Math.abs(e.touches[0].clientY - touchStartY)
  if (dy > 10) {
    touchMoved = true
    draggedId.value = queueStore.filteredEntries[touchStartIdx]?.id || null
  }
  if (touchMoved && draggedId.value) {
    // Calculate which index we're over
    const items = document.querySelectorAll('[draggable="true"]')
    const y = e.touches[0].clientY
    let targetIdx = touchStartIdx
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (y > rect.top && y < rect.bottom) targetIdx = i
    })
    dragOverIdx.value = targetIdx
  }
}

function onTouchEnd() {
  if (touchMoved && draggedId.value && dragOverIdx.value >= 0) {
    onDragEnd()
  } else {
    draggedId.value = null
    dragOverIdx.value = -1
  }
}

// ─── CRUD ───
function openAddModal() {
  editingEntry.value = null
  form.value = { patient_name: '', phone: '', status: 'new', notes: '', expected_time: '' }
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function openEditModal(entry) {
  editingEntry.value = entry
  form.value = {
    patient_name: entry.patient_name,
    phone: entry.phone,
    status: entry.status,
    notes: entry.notes,
    expected_time: entry.expected_time,
  }
  showModal.value = true
  nextTick(() => nameInput.value?.focus())
}

function savePatient() {
  if (!form.value.patient_name.trim()) {
    toast('يرجى إدخال اسم المريض')
    return
  }
  if (editingEntry.value) {
    queueStore.updateEntry(editingEntry.value.id, { ...form.value })
    toast('تم تحديث بيانات المريض')
  } else {
    queueStore.addEntry({ ...form.value })
    toast('تم إضافة المريض للدور')
  }
  showModal.value = false
  _persist()
}

function skipPatient(id) {
  queueStore.skipEntry(id)
  toast('تم نقل المريض لآخر القائمة')
  _persist()
}

function completePatient(id) {
  queueStore.completeEntry(id)
  toast('تم الدخول — نُقل للأرشيف')
  _persist()
}

function deletePatient(id) {
  queueStore.removeEntry(id)
  toast('تم إلغاء الحجز')
  _persist()
}

function showNotes(entry) {
  notesPopup.value = entry
}

// ─── WhatsApp ───
function waLink(entry) {
  const phone = (entry.phone || '').replace(/\D/g, '')
  const msg = encodeURIComponent(`مرحباً ${entry.patient_name}، دوركم قريب في العيادة.\nالوقت المتوقع: ${entry.expected_time}`)
  return `https://wa.me/${phone}?text=${msg}`
}

function sendReadyMsg(entry) {
  const phone = (entry.phone || '').replace(/\D/g, '')
  const centerName = configStore.config?.centerName || 'العيادة'
  const msg = encodeURIComponent(`مرحباً ${entry.patient_name}، دوركم اقترب في ${centerName}.\nيرجى التوجه خلال الوقت المتوقع: ${entry.expected_time}`)
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
}

function goBack() {
  router.push({ name: 'queue' })
}

function _persist() {
  if (authStore.uid) queueStore.saveToCache(authStore.uid)
}

// Auto-save on changes
watch(() => queueStore.entries, () => _persist(), { deep: true })
</script>
