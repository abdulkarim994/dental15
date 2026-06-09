import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uid'

export const useQueueStore = defineStore('queue', () => {
  // ─── State ───
  const entries = ref([])
  const archive = ref([])
  const selectedClinic = ref('')
  const selectedDate = ref(_todayStr())
  const selectedPeriod = ref('morning')
  const defaultInterval = ref(15) // minutes

  // ─── Getters ───
  const filteredEntries = computed(() => {
    return entries.value
      .filter(
        (e) =>
          e.clinic === selectedClinic.value &&
          e.queue_date === selectedDate.value &&
          e.period === selectedPeriod.value,
      )
      .sort((a, b) => a.queue_order - b.queue_order)
  })

  const filteredArchive = computed(() => {
    return archive.value.filter(
      (e) =>
        e.clinic === selectedClinic.value &&
        e.queue_date === selectedDate.value &&
        e.period === selectedPeriod.value,
    )
  })

  const currentCount = computed(() => filteredEntries.value.length)
  const completedCount = computed(() => filteredArchive.value.length)
  const remainingCount = computed(() => currentCount.value)

  // ─── Actions ───
  function addEntry(data) {
    const order = filteredEntries.value.length + 1
    const entry = {
      id: generateId(),
      clinic: selectedClinic.value,
      queue_date: selectedDate.value,
      period: selectedPeriod.value,
      queue_order: order,
      patient_name: data.patient_name || '',
      phone: data.phone || '',
      status: data.status || 'new',
      notes: data.notes || '',
      expected_time: data.expected_time || _calcExpectedTime(order),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    entries.value = [...entries.value, entry]
    return entry
  }

  function updateEntry(id, updates) {
    const idx = entries.value.findIndex((e) => e.id === id)
    if (idx === -1) return
    const updated = [...entries.value]
    updated[idx] = { ...updated[idx], ...updates, updated_at: new Date().toISOString() }
    entries.value = updated
  }

  function removeEntry(id) {
    entries.value = entries.value.filter((e) => e.id !== id)
    _renumber()
  }

  function skipEntry(id) {
    const entry = entries.value.find((e) => e.id === id)
    if (!entry) return
    // Move to end of current filtered list
    const filtered = filteredEntries.value
    const maxOrder = filtered.length > 0 ? Math.max(...filtered.map((e) => e.queue_order)) : 0
    updateEntry(id, { queue_order: maxOrder + 1 })
    _renumber()
  }

  function completeEntry(id) {
    const entry = entries.value.find((e) => e.id === id)
    if (!entry) return
    const archiveEntry = {
      ...entry,
      completed_at: new Date().toISOString(),
    }
    archive.value = [...archive.value, archiveEntry]
    entries.value = entries.value.filter((e) => e.id !== id)
    _renumber()
  }

  function reorderEntries(newOrder) {
    // newOrder is an array of IDs in the desired order
    const otherEntries = entries.value.filter(
      (e) =>
        !(
          e.clinic === selectedClinic.value &&
          e.queue_date === selectedDate.value &&
          e.period === selectedPeriod.value
        ),
    )
    const reordered = newOrder
      .map((id, idx) => {
        const entry = entries.value.find((e) => e.id === id)
        if (!entry) return null
        return { ...entry, queue_order: idx + 1, expected_time: _calcExpectedTime(idx + 1) }
      })
      .filter(Boolean)
    entries.value = [...otherEntries, ...reordered]
  }

  // ─── Persistence helpers ───
  function loadFromCache(uid) {
    try {
      const raw = localStorage.getItem(`dental_queue_${uid}`)
      if (raw) {
        const data = JSON.parse(raw)
        entries.value = data.entries || []
        archive.value = data.archive || []
      }
    } catch { /* ignore */ }
  }

  function saveToCache(uid) {
    try {
      localStorage.setItem(
        `dental_queue_${uid}`,
        JSON.stringify({ entries: entries.value, archive: archive.value }),
      )
    } catch { /* storage full */ }
  }

  function clearData() {
    entries.value = []
    archive.value = []
  }

  function cleanOldRecords(days, deleteFromCloud = false) {
    if (!days || days <= 0) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const toDelete = archive.value.filter((e) => e.queue_date < cutoffStr)
    archive.value = archive.value.filter((e) => e.queue_date >= cutoffStr)
    return deleteFromCloud ? toDelete : []
  }

  // ─── Internal ───
  function _renumber() {
    const filtered = entries.value
      .filter(
        (e) =>
          e.clinic === selectedClinic.value &&
          e.queue_date === selectedDate.value &&
          e.period === selectedPeriod.value,
      )
      .sort((a, b) => a.queue_order - b.queue_order)

    const otherEntries = entries.value.filter(
      (e) =>
        !(
          e.clinic === selectedClinic.value &&
          e.queue_date === selectedDate.value &&
          e.period === selectedPeriod.value
        ),
    )

    const renumbered = filtered.map((e, idx) => ({
      ...e,
      queue_order: idx + 1,
      expected_time: _calcExpectedTime(idx + 1),
    }))

    entries.value = [...otherEntries, ...renumbered]
  }

  function _calcExpectedTime(order) {
    // Base time: 9:00 AM for morning, 4:00 PM for evening
    const baseHour = selectedPeriod.value === 'morning' ? 9 : 16
    const totalMinutes = baseHour * 60 + (order - 1) * defaultInterval.value
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const h12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`
  }

  function _todayStr() {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }

  return {
    entries,
    archive,
    selectedClinic,
    selectedDate,
    selectedPeriod,
    defaultInterval,
    filteredEntries,
    filteredArchive,
    currentCount,
    completedCount,
    remainingCount,
    addEntry,
    updateEntry,
    removeEntry,
    skipEntry,
    completeEntry,
    reorderEntries,
    loadFromCache,
    saveToCache,
    clearData,
    cleanOldRecords,
  }
})
