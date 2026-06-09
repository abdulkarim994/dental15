<template>
  <div ref="container" class="virtual-scroll-container" :style="{ height: containerHeight + 'px', overflow: 'auto' }" @scroll="onScroll">
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="item in visibleItems" :key="item._vsId" ref="itemRefs" :data-vs-index="item._vsIndex">
          <slot :item="item" :index="item._vsIndex" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  itemHeight: { type: Number, default: 80 },
  containerHeight: { type: Number, default: 600 },
  buffer: { type: Number, default: 5 },
})

const container = ref(null)
const itemRefs = ref([])
const scrollTop = ref(0)
const measuredHeights = ref(new Map())

function getItemHeight(index) {
  return measuredHeights.value.get(index) || props.itemHeight
}

const totalHeight = computed(() => {
  let h = 0
  for (let i = 0; i < props.items.length; i++) {
    h += getItemHeight(i)
  }
  return h
})

const startIndex = computed(() => {
  let accumulated = 0
  for (let i = 0; i < props.items.length; i++) {
    accumulated += getItemHeight(i)
    if (accumulated >= scrollTop.value) {
      return Math.max(0, i - props.buffer)
    }
  }
  return Math.max(0, props.items.length - 1)
})

const endIndex = computed(() => {
  let accumulated = 0
  const targetHeight = props.containerHeight + props.buffer * props.itemHeight
  let end = startIndex.value
  for (let i = startIndex.value; i < props.items.length; i++) {
    accumulated += getItemHeight(i)
    end = i + 1
    if (accumulated >= targetHeight) break
  }
  return Math.min(props.items.length, end + props.buffer)
})

const offsetY = computed(() => {
  let h = 0
  for (let i = 0; i < startIndex.value; i++) {
    h += getItemHeight(i)
  }
  return h
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
    ...item,
    _vsId: item.id || startIndex.value + i,
    _vsIndex: startIndex.value + i,
  }))
})

function measureItems() {
  if (!itemRefs.value) return
  const els = Array.isArray(itemRefs.value) ? itemRefs.value : [itemRefs.value]
  let changed = false
  for (const el of els) {
    if (!el) continue
    const idx = Number(el.dataset?.vsIndex ?? el.getAttribute?.('data-vs-index'))
    if (isNaN(idx)) continue
    const h = el.getBoundingClientRect().height
    if (h > 0 && h !== measuredHeights.value.get(idx)) {
      measuredHeights.value.set(idx, h)
      changed = true
    }
  }
  if (changed) {
    measuredHeights.value = new Map(measuredHeights.value)
  }
}

watch(visibleItems, () => {
  nextTick(measureItems)
}, { flush: 'post' })

watch(() => props.items.length, () => {
  measuredHeights.value = new Map()
})

let _rafId = null
function onScroll() {
  if (_rafId) return
  _rafId = requestAnimationFrame(() => {
    _rafId = null
    if (container.value) scrollTop.value = container.value.scrollTop
  })
}

onUnmounted(() => {
  if (_rafId) cancelAnimationFrame(_rafId)
})
</script>
