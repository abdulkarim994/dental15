<template>
  <div class="glass-sm p-2.5 rounded-xl" style="background:rgba(59,130,246,.04);border-color:rgba(59,130,246,.13)">
    <p class="text-[9px] font-bold opacity-55 mb-1.5">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      صور الأشعة ({{ images.length }})
    </p>
    <div v-if="images.length > 0" class="flex flex-wrap gap-1.5 mb-2" ref="galleryRef">
      <!-- Virtualized: only render visible items for large galleries -->
      <template v-if="shouldVirtualize">
        <template v-for="({ item, index }) in visibleItems" :key="index">
          <div class="relative cursor-pointer" @click="$emit('open', index)">
            <img
              :data-src="thumbSrc(item)"
              :alt="'أشعة'"
              class="w-[52px] h-[52px] object-cover rounded-lg border border-white/10"
              loading="lazy"
              ref="lazyImages"
              @load="onThumbLoad"
              @error="onThumbError"
            >
          </div>
        </template>
      </template>
      <!-- Small galleries: render all directly -->
      <template v-else>
        <div v-for="(img, i) in images" :key="i" class="relative cursor-pointer" @click="$emit('open', i)">
          <div v-if="!resolvedThumbs[i]" class="w-[52px] h-[52px] rounded-lg border border-white/10 flex items-center justify-center" style="background:rgba(59,130,246,.08)">
            <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,.5)" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
          </div>
          <img v-else :src="resolvedThumbs[i]" alt="أشعة" class="w-[52px] h-[52px] object-cover rounded-lg border border-white/10" loading="lazy">
        </div>
      </template>
    </div>
    <p v-else class="text-[10px] opacity-30 text-center py-2">لا توجد صور أشعة</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { getXrayThumbnail } from './xrays.service'
import { xrayVersion, preloadThumbnails } from '@/services/image.service'

const VIRTUALIZE_THRESHOLD = 20

const props = defineProps({
  images: { type: Array, default: () => [] },
})
defineEmits(['open'])

const galleryRef = ref(null)
const lazyImages = ref([])

const shouldVirtualize = computed(() => props.images.length > VIRTUALIZE_THRESHOLD)

// Reactive thumbnail sources — re-evaluates when xrayVersion changes (background image loads)
const resolvedThumbs = computed(() => {
  void xrayVersion.value
  return props.images.map(im => thumbSrc(im))
})

// For virtualized mode: calculate visible items
const scrollOffset = ref(0)
const visibleItems = computed(() => {
  if (!shouldVirtualize.value) return []

  const items = props.images || []
  const cols = 5
  const itemH = 56
  const bufferRows = 2
  const containerH = 300

  const startRow = Math.max(0, Math.floor(scrollOffset.value / itemH) - bufferRows)
  const visibleRows = Math.ceil(containerH / itemH)
  const endRow = Math.min(Math.ceil(items.length / cols), startRow + visibleRows + bufferRows * 2)
  const startIdx = startRow * cols
  const endIdx = Math.min(endRow * cols, items.length)

  return items.slice(startIdx, endIdx).map((item, i) => ({
    item,
    index: startIdx + i,
  }))
})

// IntersectionObserver for lazy loading thumbnails
let _observer = null

function setupObserver() {
  if (_observer) _observer.disconnect()

  _observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target
        const src = img.dataset.src
        if (src && !img.src) {
          img.src = src
        }
        _observer.unobserve(img)
      }
    }
  }, { rootMargin: '100px' })
}

function observeImages() {
  if (!shouldVirtualize.value || !_observer) return

  nextTick(() => {
    const imgs = lazyImages.value
    if (!imgs) return
    const imgArray = Array.isArray(imgs) ? imgs : [imgs]
    for (const img of imgArray) {
      if (img && img.dataset?.src) {
        _observer.observe(img)
      }
    }
  })
}

function onThumbLoad(e) {
  e.target.style.opacity = '1'
}

function onThumbError(e) {
  e.target.style.opacity = '0.3'
}

onMounted(() => {
  if (shouldVirtualize.value) {
    setupObserver()
    observeImages()
  }
  if (props.images.length) preloadThumbnails(props.images)
})

onUnmounted(() => {
  if (_observer) {
    _observer.disconnect()
    _observer = null
  }
})

watch(() => props.images.length, () => {
  if (shouldVirtualize.value) {
    setupObserver()
    nextTick(observeImages)
  }
})

function thumbSrc(im) {
  if (typeof im === 'string') return im.startsWith('http') || im.startsWith('data:') ? im : getXrayThumbnail(im)
  return im.url || (im.key ? getXrayThumbnail(im.key) : '') || im.src || ''
}
</script>
