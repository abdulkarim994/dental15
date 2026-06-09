import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const DEFAULT_CONFIG = {
  centerName: 'طب الأسنان الرقمي',
  clinics: ['عيادة 1', 'عيادة 2'],
  services: ['حشو عصب', 'خلع', 'تنظيف', 'تقويم', 'حشو', 'تركيبات'],
  payments: ['كاش', 'تحويل'],
  currency: 'د.ل',
  doctorPct: 50,
  syncMin: 30,
  autoSync: true,
  servicePrices: {},
  waTemplates: [
    { lbl: 'تذكير بموعد', msg: 'السلام عليكم {name}\nنذكركم بموعدكم في {center}.\nنرجو التأكيد أو التواصل معنا 🦷' },
    { lbl: 'تذكير بدين', msg: 'السلام عليكم {name}\nنود تذكيركم بوجود مبلغ مستحق في {center}.\nنشكر تعاونكم 🙏' },
    { lbl: 'متابعة العلاج', msg: 'السلام عليكم {name}\nنتمنى أن تكونوا بصحة وعافية.\nكيف حال الأسنان بعد آخر زيارة؟ 😊' },
    { lbl: 'عرض خاص', msg: 'السلام عليكم {name}\nيسعدنا إعلامكم عن عرض خاص في {center}.\nتواصلوا معنا لمزيد من التفاصيل ✨' },
  ],
  treatmentPlans: {},
  logo: '',
  apptNotif: true,
  followUpAuto: false,
  dcConfirm: { recOn: true, recDur: 3, debtOn: true, debtDur: 3, patOn: true, patDur: 3, apptOn: true, apptDur: 3 },
  fabPosition: 'center',
  fabVisible: true,
}

export { DEFAULT_CONFIG }

export const useConfigStore = defineStore('config', () => {
  const config = ref({ ...DEFAULT_CONFIG })

  const currency = computed(() => config.value.currency || 'د.ل')
  const centerName = computed(() => config.value.centerName || 'طب الأسنان الرقمي')
  const clinics = computed(() => config.value.clinics || [])
  const services = computed(() => config.value.services || [])
  const payments = computed(() => config.value.payments || [])

  function updateConfig(updates) {
    config.value = { ...config.value, ...updates }
  }

  function resetConfig() {
    config.value = { ...DEFAULT_CONFIG }
  }

  return {
    config,
    currency,
    centerName,
    clinics,
    services,
    payments,
    updateConfig,
    resetConfig,
    DEFAULT_CONFIG,
  }
})
