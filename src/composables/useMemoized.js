import { shallowRef, watch } from 'vue'

/**
 * Creates a memoized computed-like ref that only updates when the result
 * actually changes (by reference for objects, by value for primitives).
 * Uses shallowRef to avoid deep reactivity overhead on large arrays/objects.
 *
 * @param {Function} getter - reactive getter function
 * @param {Function} [isEqual] - custom equality check (default: ===)
 * @returns {import('vue').ShallowRef}
 */
export function useMemoized(getter, isEqual) {
  const cached = shallowRef(getter())
  const eq = isEqual || ((a, b) => a === b)

  watch(getter, (newVal) => {
    if (!eq(newVal, cached.value)) {
      cached.value = newVal
    }
  })

  return cached
}

/**
 * Memoize an array computation — only triggers downstream reactivity
 * when the array length or element identity changes.
 */
export function useMemoizedArray(getter) {
  return useMemoized(getter, (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return a === b
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  })
}
