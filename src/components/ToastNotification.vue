<template>
  <Transition name="toast">
    <div v-if="toastVisible" class="toast-el">{{ toastMessage }}</div>
  </Transition>
</template>

<script setup>
import { useToast } from '@/composables/useToast'
const { toastMessage, toastVisible } = useToast()
</script>

<style scoped>
.toast-enter-active { transition: opacity .35s, transform .35s; }
.toast-leave-active { transition: opacity .35s; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(10px); }
.toast-leave-to { opacity: 0; }
</style>
