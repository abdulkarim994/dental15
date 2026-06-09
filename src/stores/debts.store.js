import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { markDebtsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import { sanitizeDebt } from '@/utils/sanitize'
import { logError, ErrorCategory, ErrorSeverity } from '@/services/error.service'

export const useDebtsStore = defineStore('debts', () => {
  const debts = shallowRef([])
  const isLoadedFromCache = shallowRef(false)

  function addDebt(debt) {
    const clean = sanitizeDebt(debt)
    debts.value = [...debts.value, clean]
    markDebtsDirty()
    enqueueSyncAction({ type: 'debt_add', table: 'debts', recordId: clean.id, data: clean }).catch(e => logError(e, { source: 'debts.addDebt.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
  }

  function updateDebt(id, updates) {
    const idx = debts.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      const clean = sanitizeDebt(updates)
      const updated = [...debts.value]
      updated[idx] = { ...updated[idx], ...clean }
      debts.value = updated
      markDebtsDirty()
      enqueueSyncAction({ type: 'debt_update', table: 'debts', recordId: id, data: { id, ...clean } }).catch(e => logError(e, { source: 'debts.updateDebt.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
    }
  }

  function deleteDebt(id) {
    debts.value = debts.value.filter(d => d.id !== id)
    markDebtsDirty()
    enqueueSyncAction({ type: 'debt_delete', table: 'debts', recordId: id, data: { id } }).catch(e => logError(e, { source: 'debts.deleteDebt.enqueue', category: ErrorCategory.SYNC, severity: ErrorSeverity.LOW }))
  }

  return {
    debts,
    isLoadedFromCache,
    addDebt,
    updateDebt,
    deleteDebt,
  }
})
