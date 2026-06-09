import { ref } from 'vue'
import { useAppStore } from '@/stores/app.store'

const dcVisible = ref(false)
const dcTitle = ref('')
const dcMsg = ref('')
const dcDuration = ref(3)
let dcCallback = null

export function useDoubleConfirm() {
  const app = useAppStore()

  function getDcConfig(dcType) {
    const dc = app.config.dcConfirm || {}
    const keyMap = { records: 'rec', debts: 'debt', patients: 'pat', appointments: 'appt' }
    const k = keyMap[dcType] || dcType
    if (k && dc[k + 'On'] !== undefined) {
      return { enabled: dc[k + 'On'] !== false, duration: dc[k + 'Dur'] || 3 }
    }
    return { enabled: true, duration: 3 }
  }

  function dblConfirm(title, msg, onConfirm, dcType) {
    const typeCfg = getDcConfig(dcType)
    if (typeCfg.enabled === false) { onConfirm(); return }
    dcTitle.value = title
    dcMsg.value = msg
    dcDuration.value = Math.max(0, typeCfg.duration || 3)
    dcCallback = onConfirm
    dcVisible.value = true
  }

  function onDcConfirm() {
    dcVisible.value = false
    if (dcCallback) dcCallback()
    dcCallback = null
  }

  function onDcCancel() {
    dcVisible.value = false
    dcCallback = null
  }

  return { dcVisible, dcTitle, dcMsg, dcDuration, dblConfirm, onDcConfirm, onDcCancel }
}
