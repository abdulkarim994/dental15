/**
 * Pagination Utilities — Phase 2
 *
 * Since the dental clinic app uses a KV-based Supabase model (all data for a
 * data_type is stored as a single JSON blob), pagination happens at the
 * application layer — not at the database level.
 *
 * These utilities provide efficient in-memory pagination, filtering, and
 * sorting for the heavy data arrays (records, debts, appointments).
 *
 * Usage in components:
 *   const paged = usePagination(records, { pageSize: 50 })
 *   // paged.items — current page items
 *   // paged.nextPage() — go to next page
 *   // paged.totalPages — total pages
 */

import { ref, computed, watch } from 'vue'

const DEFAULT_PAGE_SIZE = 50

/**
 * Create a reactive paginated view of an array.
 *
 * @param {import('vue').Ref<Array>} sourceRef - Reactive array reference
 * @param {Object} options
 * @param {number} [options.pageSize=50] - Items per page
 * @param {Function} [options.filterFn] - Filter function (item) => boolean
 * @param {Function} [options.sortFn] - Sort function (a, b) => number
 * @returns Pagination controls and reactive page data
 */
export function usePagination(sourceRef, options = {}) {
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE
  const currentPage = ref(1)
  const filterFn = ref(options.filterFn || null)
  const sortFn = ref(options.sortFn || null)

  const filtered = computed(() => {
    let items = sourceRef.value || []
    if (filterFn.value) {
      items = items.filter(filterFn.value)
    }
    if (sortFn.value) {
      items = [...items].sort(sortFn.value)
    }
    return items
  })

  const totalItems = computed(() => filtered.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)))

  // Reset to page 1 when the source data or filter changes
  watch([() => sourceRef.value?.length, filterFn], () => {
    currentPage.value = 1
  })

  const items = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filtered.value.slice(start, start + pageSize)
  })

  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPrevPage = computed(() => currentPage.value > 1)

  function nextPage() {
    if (hasNextPage.value) currentPage.value++
  }

  function prevPage() {
    if (hasPrevPage.value) currentPage.value--
  }

  function goToPage(page) {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  }

  function setFilter(fn) {
    filterFn.value = fn
  }

  function setSort(fn) {
    sortFn.value = fn
  }

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    setFilter,
    setSort,
    pageSize,
  }
}

/**
 * Create a reactive infinite-scroll view.
 * Loads more items as the user scrolls down.
 *
 * @param {import('vue').Ref<Array>} sourceRef - Reactive array reference
 * @param {Object} options
 * @param {number} [options.initialSize=30] - Initial items to show
 * @param {number} [options.increment=20] - Items to add on each load-more
 * @param {Function} [options.filterFn] - Filter function
 * @param {Function} [options.sortFn] - Sort function
 */
export function useInfiniteScroll(sourceRef, options = {}) {
  const initialSize = options.initialSize || 30
  const increment = options.increment || 20
  const visibleCount = ref(initialSize)
  const filterFn = ref(options.filterFn || null)
  const sortFn = ref(options.sortFn || null)

  const filtered = computed(() => {
    let items = sourceRef.value || []
    if (filterFn.value) {
      items = items.filter(filterFn.value)
    }
    if (sortFn.value) {
      items = [...items].sort(sortFn.value)
    }
    return items
  })

  const totalItems = computed(() => filtered.value.length)

  // Reset visible count when source changes
  watch([() => sourceRef.value?.length, filterFn], () => {
    visibleCount.value = initialSize
  })

  const items = computed(() => filtered.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < totalItems.value)

  function loadMore() {
    if (hasMore.value) {
      visibleCount.value = Math.min(visibleCount.value + increment, totalItems.value)
    }
  }

  function reset() {
    visibleCount.value = initialSize
  }

  function setFilter(fn) {
    filterFn.value = fn
  }

  function setSort(fn) {
    sortFn.value = fn
  }

  return {
    items,
    totalItems,
    hasMore,
    loadMore,
    reset,
    setFilter,
    setSort,
    visibleCount,
  }
}

/**
 * Simple slice utility for non-reactive contexts.
 */
export function paginate(array, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const start = (page - 1) * pageSize
  return {
    items: array.slice(start, start + pageSize),
    totalPages: Math.max(1, Math.ceil(array.length / pageSize)),
    totalItems: array.length,
    page,
    pageSize,
  }
}
