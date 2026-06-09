# Dead Code Manifest — Phase 6 Trace Analysis

Files/exports confirmed unused via import trace analysis (2026-05-10).

## Removed Files

| File | Reason | Status |
|------|--------|--------|
| `composables/useDebounce.js` | Not imported anywhere. `utils/debounce.js` is used instead. | Deleted |
| `composables/useVirtualGallery.js` | Not imported anywhere. `XrayGallery.vue` inlines its own virtualization. | Deleted |
| `utils/icons.js` | Not imported anywhere. Component-based icons (`components/icons/`) used instead. | Deleted |

## Previously Unused — Now Connected

| File | Export | Status |
|------|--------|--------|
| `composables/useMemoized.js` | `useMemoized`, `useMemoizedArray` | Now used in `patients.store.js` |
| `utils/pagination.js` | `usePagination`, `useInfiniteScroll`, `paginate` | Now exported via `@/utils` and `@/domains/billing` |
| `utils/debounce.js` | `throttle` | Now exported via `@/utils` index |

## Unused Exports (kept for future use)

| File | Export | Reason |
|------|--------|--------|
| `utils/format.js` | `formatDate`, `getMonthFromDate` | Not imported anywhere. Kept as valid utilities. |
