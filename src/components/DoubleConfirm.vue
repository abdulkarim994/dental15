<template>
  <Teleport to="body">
    <div v-if="visible" class="dbl-confirm-ol" @click.self="cancel">
      <div class="dbl-confirm-box">
        <div class="dc-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <div class="dc-title">{{ title }}</div>
        <div class="dc-msg">{{ msg }}</div>
        <div class="dc-warn">⚠️ هذا الإجراء لا يمكن التراجع عنه!</div>
        <div class="dc-btns">
          <button class="dc-btn-cancel" @click="cancel">إلغاء</button>
          <button class="dc-btn-del" :class="{ 'dc-ready': countdown <= 0 }" @click="confirmDel">تأكيد الحذف</button>
        </div>
        <div class="dc-countdown">
          <template v-if="countdown > 0">يمكنك التأكيد بعد <b>{{ countdown }}</b> ثوانٍ...</template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'تأكيد الحذف' },
  msg: { type: String, default: '' },
  duration: { type: Number, default: 3 },
})
const emit = defineEmits(['confirm', 'cancel'])

const countdown = ref(0)
let timer = null

function startCountdown() {
  clearInterval(timer)
  countdown.value = Math.max(0, props.duration)
  if (countdown.value > 0) {
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  }
}

watch(() => props.visible, (v) => {
  if (v) startCountdown()
  else { clearInterval(timer); countdown.value = 0 }
})

function cancel() { emit('cancel') }
function confirmDel() {
  if (countdown.value > 0) return
  emit('confirm')
}

onUnmounted(() => clearInterval(timer))
</script>
