<template>
  <div class="lazy-img-wrap" ref="wrapEl" :style="{ width, height, minHeight: height }">
    <img
      v-if="isVisible && thumbnailSrc && !isLoaded"
      :src="thumbnailSrc"
      :alt="alt"
      class="lazy-img lazy-thumb"
      :class="{ loaded: true }"
    />
    <img
      v-if="isVisible"
      :src="fullSrc || src"
      :alt="alt"
      class="lazy-img"
      :class="{ loaded: isLoaded, 'blur-sm': !isLoaded && thumbnailSrc }"
      loading="lazy"
      @load="isLoaded = true"
      @error="hasError = true"
    />
    <div v-if="!isLoaded && !hasError && !thumbnailSrc" class="lazy-placeholder">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </div>
    <div v-if="hasError" class="lazy-placeholder">
      <span class="text-[9px] opacity-30">⚠</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: String, default: '100%' },
  height: { type: String, default: '80px' },
  thumbnailSrc: { type: String, default: '' },
  fullSrc: { type: String, default: '' },
})

const wrapEl = ref(null)
const isVisible = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)

let observer = null

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    isVisible.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        isVisible.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '200px' }
  )
  if (wrapEl.value) observer.observe(wrapEl.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<style scoped>
.lazy-img-wrap { position: relative; overflow: hidden; border-radius: 10px; background: rgba(255,255,255,.03) }
.lazy-img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .3s ease, filter .3s ease }
.lazy-img.loaded { opacity: 1 }
.lazy-img.blur-sm { filter: blur(8px); opacity: 1 }
.lazy-thumb { position: absolute; inset: 0; z-index: 0 }
.lazy-img:not(.lazy-thumb) { position: relative; z-index: 1 }
.lazy-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center }
</style>
