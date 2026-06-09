/**
 * Billing Domain — Phase 6
 *
 * Aggregates debt management and financial calculation services.
 *
 * Dependencies:
 *   - Repository: debts.repository (local cache)
 *   - DTO: debt.dto (data mapping)
 *   - Store: debts.store (state management)
 *   - Module service: prosthetics.service (prosthetic billing)
 *   - Module service: reports.service (financial reports)
 */

export { debtsRepository } from '@/repositories/debts.repository'
export { toDebtDTO, toDebtDB, toDebtDTOList } from '@/dto/debt.dto'
export { useDebtsStore } from '@/stores/debts.store'
export {
  calculateProstheticShares,
  getProstheticStats,
  createProstheticRecord,
} from '@/modules/prosthetics/prosthetics.service'
export {
  getMonthlyReport,
  getPatientReport,
  getServiceBreakdown,
} from '@/modules/reports/reports.service'
export { usePagination, useInfiniteScroll, paginate } from '@/utils/pagination'
