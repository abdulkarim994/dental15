<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-ol" style="display:flex;align-items:flex-start;justify-content:center;padding-top:24px" @click.self="$emit('close')">
      <div class="glass p-5 w-full max-w-sm mx-3 space-y-4 rounded-2xl max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="flex justify-between items-center">
          <h3 class="font-bold text-sm" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            خطة العلاج
          </h3>
          <button @click="$emit('close')" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
        </div>
        <p class="text-[10px] opacity-50">المريض: {{ patientName }}</p>

        <div v-if="!stages.length" class="text-xs opacity-40 text-center py-4">لا توجد مراحل — أضف مرحلة أدناه</div>
        <div v-else class="space-y-2">
          <div v-for="(s, i) in stages" :key="s.id" class="tp-stage" :class="{ done: s.done }">
            <div class="tp-check" :class="{ checked: s.done }" @click="toggleStage(i)">{{ s.done ? '✓' : '' }}</div>
            <div class="flex-1 min-w-0">
              <p class="tp-desc text-xs font-bold">{{ s.desc }}</p>
              <p v-if="s.doneDate" class="text-[9px] opacity-40">أُنجز: {{ s.doneDate }}</p>
            </div>
            <button @click="removeStage(i)" class="text-[10px] px-1.5 py-0.5 rounded" style="color:var(--red);opacity:.6">✕</button>
          </div>
        </div>

        <div class="flex gap-2">
          <input type="text" v-model="newStage" class="inp flex-1 text-xs" placeholder="وصف المرحلة الجديدة..." @keyup.enter="addStage">
          <button @click="addStage" class="btn-g px-3 py-1.5 text-xs">+ إضافة</button>
        </div>

        <div class="flex gap-2 pt-2 border-t border-white/10">
          <button @click="$emit('close')" class="btn-o flex-1 py-2 text-xs">إلغاء</button>
          <button @click="save" class="btn-g flex-1 py-2 text-xs">حفظ الخطة</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { saveTreatmentPlan, getTreatmentPlan } from './treatments.service'
import { useToast } from '@/composables/useToast'
import { generateId } from '@/utils/uid'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patientName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'saved'])
const { toast } = useToast()

const stages = ref([])
const newStage = ref('')

watch(() => props.visible, (v) => {
  if (v && props.patientName) {
    stages.value = JSON.parse(JSON.stringify(getTreatmentPlan(props.patientName)))
    newStage.value = ''
  }
})

function toggleStage(i) {
  stages.value[i].done = !stages.value[i].done
  stages.value[i].doneDate = stages.value[i].done
    ? new Date().toISOString().substring(0, 10) : ''
}

function removeStage(i) {
  stages.value.splice(i, 1)
}

function addStage() {
  const v = (newStage.value || '').trim()
  if (!v) { toast('أدخل وصف المرحلة'); return }
  stages.value.push({ id: generateId(), desc: v, done: false, doneDate: '' })
  newStage.value = ''
}

function save() {
  saveTreatmentPlan(props.patientName, stages.value)
  toast('تم حفظ خطة العلاج')
  emit('saved')
  emit('close')
}
</script>
