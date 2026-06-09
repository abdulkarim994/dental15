import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { markMonthDirty } from '@/services/sync.service'
import { sanitizeRecord } from '@/utils/sanitize'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import { logError, ErrorCategory, ErrorSeverity } from '@/services/error.service'

export const useRecordsStore = defineStore('records', () => {
  const records = shallowRef([])
  const prosthetics = shallowRef([])
  const isLoadedFromCache = shallowRef(false)

  function addRecord(record) {
    const clean = sanitizeRecord(record)
    clean._mod = Date.now()
    records.value = [...records.value, clean]
    markMonthDirty(clean.date)
    enqueueSyncAction({ type: 'record_add', table: 'records', recordId: clean.id, data: clean }).catch(e => logError(e, { source: 'records.addRecord.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
  }

  function updateRecord(id, updates) {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      const updated = [...records.value]
      updated[idx] = { ...updated[idx], ...updates, _mod: Date.now() }
      records.value = updated
      markMonthDirty(records.value[idx].date)
      enqueueSyncAction({ type: 'record_update', table: 'records', recordId: id, data: { id, ...updates } }).catch(e => logError(e, { source: 'records.updateRecord.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
    }
  }

  function deleteRecord(id) {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      markMonthDirty(records.value[idx].date)
      records.value = records.value.filter(r => r.id !== id)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: id, data: { id } }).catch(e => logError(e, { source: 'records.deleteRecord.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
    }
  }

  function deleteProsthetic(id) {
    const idx = prosthetics.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      markMonthDirty(prosthetics.value[idx].date)
      prosthetics.value = prosthetics.value.filter(p => p.id !== id)
      enqueueSyncAction({ type: 'prosthetic_delete', table: 'prosthetics', recordId: id, data: { id } }).catch(e => logError(e, { source: 'records.deleteProsthetic.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
    }
  }

  function batchSetRecords(recs, pros) {
    records.value = recs
    if (pros !== undefined) prosthetics.value = pros
  }

  return {
    records,
    prosthetics,
    isLoadedFromCache,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteProsthetic,
    batchSetRecords,
  }
})
