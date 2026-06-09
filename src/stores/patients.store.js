import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAppStore } from './app.store'
import { fuzzyMatch, fuzzyScore } from '@/utils/search'
import { getPatientPhotoFromStorage, savePatientPhotoToStorage } from '@/services/cache.service'
import { isProsthetic } from '@/utils/format'
import { useMemoizedArray } from '@/composables/useMemoized'
import { patientsRepo } from '@/repositories/patients.repository'

export const usePatientsStore = defineStore('patients', () => {
  const searchQuery = ref('')
  const selectedPatient = ref(null)
  const showDetail = ref(false)
  const isLoadedFromCache = ref(false)
  const _photoCache = reactive({})

  let _patMapCache = null
  let _patMapCacheKey = ''

  const patientMap = computed(() => {
    const appStore = useAppStore()
    const recs = appStore.records || []
    const pros = appStore.prosthetics || []
    const dbts = appStore.debts || []

    const lastRecMod = recs.reduce((m, r) => Math.max(m, Number(r._mod || 0)), 0)
    const lastProsMod = pros.reduce((m, p) => Math.max(m, Number(p._mod || 0)), 0)
    const lastDebtMod = dbts.reduce((m, d) => Math.max(m, Number(d._mod || 0)), 0)
    const cacheKey = `${recs.length}:${pros.length}:${dbts.length}:${lastRecMod}:${lastProsMod}:${lastDebtMod}`
    if (_patMapCache && _patMapCacheKey === cacheKey) return _patMapCache

    const all = [...recs, ...pros]
    const map = {}
    const matchedDebtIds = new Set()

    all.forEach(r => {
      if (!r.name?.trim()) return
      const k = r.name.trim()
      if (!map[k]) {
        map[k] = {
          name: k,
          entries: [],
          total: 0,
          grossTotal: 0,
          visitCount: 0,
          lastDate: '',
          lastMod: 0,
          services: new Set(),
          debtTotal: 0,
          debtRemaining: 0,
          labTotal: 0,
          labPaid: 0,
        }
      }

      const enriched = { ...r, _s: r._t === 'p' ? 'p' : 'r', amount: Number(r.amount || r.total || 0) || 0 }
      map[k].entries.push(enriched)

      const entryGross = Number(r.amount || r.total || 0) || 0

      if (r.isDebtPayment) {
        // debt payments are already counted in paidAmount
      } else if (r.isDebt) {
        map[k].visitCount++
        map[k].grossTotal += entryGross
        const isPros = r._t === 'p' || r._s === 'p'
        const dbt = isPros
          ? dbts.find(d => d.prostheticId === r.id)
          : dbts.find(d => d.recordId === r.id)
        if (dbt) matchedDebtIds.add(dbt.id)
        map[k].total += dbt ? (Number(dbt.paidAmount || 0) || 0) : entryGross
      } else {
        map[k].visitCount++
        map[k].grossTotal += entryGross
        map[k].total += entryGross
      }

      if (!map[k].lastDate || r.date > map[k].lastDate) map[k].lastDate = r.date
      const mod = Number(r._mod || 0) || 0
      if (mod > map[k].lastMod) map[k].lastMod = mod
      if (r.service) map[k].services.add(r.service)
    })

    dbts.forEach(d => {
      if (!d.name?.trim()) return
      const k = d.name.trim()
      if (!map[k]) {
        map[k] = {
          name: k,
          entries: [],
          total: 0,
          grossTotal: 0,
          visitCount: 0,
          lastDate: '',
          lastMod: 0,
          services: new Set(),
          debtTotal: 0,
          debtRemaining: 0,
          labTotal: 0,
          labPaid: 0,
        }
      }
      map[k].debtTotal += (Number(d.totalAmount || d.total || 0) || 0)
      map[k].debtRemaining += (Number(d.remaining || 0) || 0)
      if (d.type === 'prosthetic') {
        map[k].labTotal += (Number(d.labValue || 0) || 0)
        map[k].labPaid += (Number(d.labPaid || 0) || 0)
      }
      if (!matchedDebtIds.has(d.id)) {
        const debtGross = Number(d.totalAmount || d.total || 0) || 0
        map[k].visitCount++
        map[k].grossTotal += debtGross
        map[k].total += (Number(d.paidAmount || 0) || 0)
        if (d.date && (!map[k].lastDate || d.date > map[k].lastDate)) map[k].lastDate = d.date
        if (d.service) map[k].services.add(d.service)
      }
    })

    _patMapCache = map
    _patMapCacheKey = cacheKey
    return map
  })

  const _rawFilteredPatients = computed(() => {
    const map = patientMap.value
    let pts = Object.values(map).sort(
      (a, b) => (b.lastMod || 0) - (a.lastMod || 0) || b.lastDate.localeCompare(a.lastDate),
    )

    const q = searchQuery.value.trim()
    if (q) {
      pts = pts.filter(p => fuzzyMatch(q, p.name))
      pts.sort((a, b) => fuzzyScore(q, a.name) - fuzzyScore(q, b.name))
    }

    return pts
  })

  const filteredPatients = useMemoizedArray(() => _rawFilteredPatients.value)

  const totalPatients = computed(() => Object.keys(patientMap.value).length)

  function getPatientPhoto(name) {
    if (_photoCache[name] !== undefined) return _photoCache[name]
    _photoCache[name] = null
    getPatientPhotoFromStorage(name).then(data => {
      if (data) _photoCache[name] = data
    }).catch(() => {})
    return _photoCache[name]
  }

  function savePatientPhoto(name, dataUrl) {
    _photoCache[name] = dataUrl
    savePatientPhotoToStorage(name, dataUrl).catch(() => {})
  }

  function getActiveDebts(name) {
    const appStore = useAppStore()
    return appStore.debts.filter(d => d.name === name && d.status !== 'paid')
  }

  function hasReport(patient) {
    return patient.entries.some(e =>
      e.report && (Array.isArray(e.report) ? e.report.length > 0 : (e.report.entries?.length || 0) > 0),
    )
  }

  function hasProsthetics(patient) {
    return patient.entries.some(e => e._s === 'p' || e._t === 'p')
  }

  function getTreatmentPlan(name) {
    const appStore = useAppStore()
    return (appStore.config.treatmentPlans && appStore.config.treatmentPlans[name]) || []
  }

  function getPatientPhone(name) {
    const appStore = useAppStore()
    const debt = appStore.debts.find(d => d.name === name && d.phone)
    return debt?.phone ? (debt.phone + '').replace(/[^0-9]/g, '') : ''
  }

  function getPatientTeeth(name) {
    const patient = patientMap.value[name]
    if (!patient) return {}
    const teeth = {}
    patient.entries.forEach(e => {
      const isPros = e._t === 'p' || isProsthetic(e.service || '')
      const entries = e.report?.entries || (Array.isArray(e.report) ? e.report : [])
      entries.forEach(entry => {
        (entry.teeth || []).forEach(t => {
          if (!teeth[t] || isPros) teeth[t] = isPros ? 'prosth' : 'treated'
        })
      })
    })
    return teeth
  }

  function setSearch(q) {
    searchQuery.value = q
  }

  function selectPatient(name) {
    selectedPatient.value = name
    showDetail.value = true
  }

  function clearSelection() {
    selectedPatient.value = null
    showDetail.value = false
  }

  function invalidatePatientCache() {
    _patMapCache = null
    _patMapCacheKey = ''
  }

  function linkRecordToPatient(patientName, newRecord) {
    invalidatePatientCache()

    patientsRepo.upsert({
      id: patientName,
      name: patientName,
      last_visit: newRecord.date || null,
      _mod: newRecord._mod || Date.now(),
    }).catch(() => {})
  }

  return {
    searchQuery,
    selectedPatient,
    showDetail,
    isLoadedFromCache,
    patientMap,
    filteredPatients,
    totalPatients,
    getPatientPhoto,
    savePatientPhoto,
    getActiveDebts,
    hasReport,
    hasProsthetics,
    getTreatmentPlan,
    getPatientPhone,
    getPatientTeeth,
    setSearch,
    selectPatient,
    clearSelection,
    invalidatePatientCache,
    linkRecordToPatient,
  }
})
