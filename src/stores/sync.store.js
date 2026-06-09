import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSyncStore = defineStore('sync', () => {
  const syncing = ref(false)
  const syncMessage = ref('')
  const syncProgress = ref(0)

  return {
    syncing,
    syncMessage,
    syncProgress,
  }
})
