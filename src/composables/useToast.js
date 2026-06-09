import { ref } from 'vue'

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null

export function useToast() {
  function show(msg, duration = 2500) {
    toastMessage.value = msg
    toastVisible.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  return {
    toastMessage,
    toastVisible,
    toast: show,
  }
}
