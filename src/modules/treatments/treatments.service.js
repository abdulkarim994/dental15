import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

export function getTreatmentPlan(patientName) {
  const app = useAppStore()
  return (app.config.treatmentPlans && app.config.treatmentPlans[patientName]) || []
}

export function saveTreatmentPlan(patientName, stages) {
  const app = useAppStore()
  const auth = useAuthStore()
  if (!app.config.treatmentPlans) app.config.treatmentPlans = {}
  app.config.treatmentPlans[patientName] = stages
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
}

export function deleteTreatmentPlan(patientName) {
  const app = useAppStore()
  const auth = useAuthStore()
  if (app.config.treatmentPlans) {
    delete app.config.treatmentPlans[patientName]
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false)
  }
}
