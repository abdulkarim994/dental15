<template>
  <Teleport to="body">
    <div v-if="visible" class="xray-ol" @click.self="close">
      <div class="xray-bar">
        <div class="xb-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
          {{ patientName }} — أشعة {{ currentIdx + 1 }}/{{ images.length }}
        </div>
        <div class="xb-btns">
          <button class="xb-btn" :class="{ 'xb-busy': downloading }" @click="downloadCurrent" title="تنزيل الصورة" :disabled="downloading">
            <svg v-if="!downloading" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <svg v-else class="animate-spin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </button>
          <button class="xb-btn xb-del" @click="deleteCurrent" title="حذف">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
          <button class="xb-btn" @click="close" title="إغلاق">✕</button>
        </div>
      </div>
      <div class="xray-body" ref="bodyEl" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @wheel.prevent="onWheel" @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd">
        <div v-if="imgError" class="xray-loading xray-error">
          <img v-if="thumbSrc" :src="thumbSrc" :alt="patientName + ' أشعة'" class="xray-preview-blur" :style="imgStyle">
          <div class="xray-retry-box">
            <span class="xray-retry-msg">تعذّر تحميل الصورة</span>
            <button class="xray-retry-btn" @click="retryLoad">إعادة المحاولة</button>
          </div>
        </div>
        <div v-else-if="imgLoading || !currentSrc" class="xray-loading">
          <img v-if="thumbSrc" :src="thumbSrc" :alt="patientName + ' أشعة'" class="xray-preview-blur" :style="imgStyle">
          <div class="xray-spinner"></div>
        </div>
        <!-- FIX: only render img when src is non-empty — avoids immediate error event on empty src -->
        <img v-if="currentSrc" ref="imgEl" :src="currentSrc" :alt="patientName + ' أشعة'" :style="imgStyle" draggable="false" @load="onImageLoad" @error="onImageError" :class="{ 'xray-img-hidden': imgLoading || imgError }">
      </div>
      <div class="xray-tools">
        <button class="xt-btn" @click="zoomIn">🔍+</button>
        <button class="xt-btn" @click="zoomOut">🔍−</button>
        <button class="xt-btn" @click="rotate">↻ تدوير</button>
        <button class="xt-btn" :class="{ 'xt-on': st.invert }" @click="toggleInvert">◑ عكس</button>
        <button class="xt-btn" @click="brightUp">☀ سطوع+</button>
        <button class="xt-btn" @click="brightDown">☀ سطوع−</button>
        <button class="xt-btn" @click="contrastUp">◐ تباين+</button>
        <button class="xt-btn" @click="contrastDown">◐ تباين−</button>
        <button class="xt-btn" @click="reset">⟳ إعادة</button>
      </div>
      <div v-if="images.length > 1" class="xray-thumbs">
        <img v-for="(im, i) in images" :key="i" :src="thumbStripSrc(im)" :class="{ 'xt-sel': i === currentIdx }" @click="goTo(i)" loading="lazy">
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getImageUrl, getImageSecure, getImagePersistent, getThumbnailUrl, xrayVersion } from '@/services/image.service'
import { preloadAdjacent } from '@/services/image-pipeline.service'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  visible: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  patientName: { type: String, default: '' },
  startIndex: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'delete'])

const { toast } = useToast()

const bodyEl = ref(null)
const imgEl = ref(null)
const currentIdx = ref(0)
const imgLoading = ref(false)
const imgError = ref(false)
const activeSrc = ref('')
const downloading = ref(false)
let _loadSeq = 0
let _loadTimer = null

const st = reactive({
  zoom: 1, rotate: 0, invert: false,
  brightness: 100, contrast: 100,
  panX: 0, panY: 0, dragging: false, lx: 0, ly: 0,
})

let _popHandler = null
watch(() => props.visible, (v) => {
  if (v) {
    currentIdx.value = Math.min(props.startIndex, props.images.length - 1)
    resetState()
    loadCurrent()
    document.body.style.overflow = 'hidden'
    preloadAdjacent(props.images, currentIdx.value, imgSrc)
    history.pushState({ xray: true }, '')
    _popHandler = () => { if (props.visible) close() }
    window.addEventListener('popstate', _popHandler)
  } else {
    document.body.style.overflow = ''
    if (_popHandler) { window.removeEventListener('popstate', _popHandler); _popHandler = null }
  }
})
onBeforeUnmount(() => {
  if (_popHandler) { window.removeEventListener('popstate', _popHandler); _popHandler = null }
  document.removeEventListener('visibilitychange', _onVis)
  if (_loadTimer) { clearTimeout(_loadTimer); _loadTimer = null }
  try { _appResumeHandle?.remove?.() } catch { /* ignore */ }
})

function resetState() {
  st.zoom = 1; st.rotate = 0; st.invert = false
  st.brightness = 100; st.contrast = 100
  st.panX = 0; st.panY = 0; st.dragging = false
}

function imgSrc(im) {
  if (typeof im === 'string') return im.startsWith('http') || im.startsWith('data:') ? im : getImageUrl(im)
  return im.url || (im.key ? getImageUrl(im.key) : '') || im.src || ''
}

function thumbStripSrc(im) {
  void xrayVersion.value // re-evaluate strip when a thumbnail finishes restoring
  if (typeof im === 'string') return im.startsWith('http') || im.startsWith('data:') ? im : getThumbnailUrl(im)
  return im.url || (im.key ? getThumbnailUrl(im.key) : '') || im.src || ''
}

const currentSrc = computed(() => activeSrc.value)

// Deterministically resolve the current image: cache → IndexedDB → R2 (persisted).
// Guarantees the spinner ends (success or a retry affordance) instead of hanging
// forever after the app is minimized/resumed and the in-memory cache is gone.
async function loadCurrent() {
  const seq = ++_loadSeq
  const im = props.images[currentIdx.value]
  imgError.value = false
  if (_loadTimer) { clearTimeout(_loadTimer); _loadTimer = null }
  if (!im) { activeSrc.value = ''; imgLoading.value = false; return }

  // Direct sources (http/data/blob already attached) need no resolution.
  const direct = typeof im === 'string'
    ? (im.startsWith('http') || im.startsWith('data:') ? im : '')
    : (im.url || im.src || '')
  if (direct) { activeSrc.value = direct; imgLoading.value = true; return }

  const key = typeof im === 'string' ? im : im?.key
  if (!key) { activeSrc.value = ''; imgLoading.value = false; imgError.value = true; return }

  imgLoading.value = true
  // Safety timeout: never spin forever — surface a retry button if R2 stalls.
  _loadTimer = setTimeout(() => {
    if (seq === _loadSeq && imgLoading.value && !activeSrc.value) {
      imgLoading.value = false
      imgError.value = true
    }
  }, 15000)

  let url = ''
  try { url = await getImagePersistent(key) } catch { url = '' }
  if (seq !== _loadSeq) return
  if (_loadTimer) { clearTimeout(_loadTimer); _loadTimer = null }
  if (url) {
    activeSrc.value = url
  } else {
    activeSrc.value = ''
    imgLoading.value = false
    imgError.value = true
  }
}

function retryLoad() { loadCurrent() }

// Re-resolve the open image when returning from background (web + native).
function _onResume() {
  if (!props.visible) return
  if (!activeSrc.value || imgError.value) loadCurrent()
}
function _onVis() { if (document.visibilityState === 'visible') _onResume() }
let _appResumeHandle = null
onMounted(() => {
  document.addEventListener('visibilitychange', _onVis)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => { if (isActive) _onResume() })
        .then(h => { _appResumeHandle = h })
    }).catch(() => {})
  }
})

const imgStyle = computed(() => ({
  transform: `scale(${st.zoom}) rotate(${st.rotate}deg) translate(${st.panX / st.zoom}px, ${st.panY / st.zoom}px)`,
  filter: `invert(${st.invert ? 1 : 0}) brightness(${st.brightness}%) contrast(${st.contrast}%)`,
  cursor: st.zoom > 1 ? 'grab' : 'default',
}))

function zoomIn() { st.zoom = Math.min(5, st.zoom + 0.25); applyPanLimit() }
function zoomOut() { st.zoom = Math.max(0.5, st.zoom - 0.25); applyPanLimit() }
function rotate() { st.rotate = (st.rotate + 90) % 360 }
function toggleInvert() { st.invert = !st.invert }
function brightUp() { st.brightness = Math.min(300, st.brightness + 15) }
function brightDown() { st.brightness = Math.max(20, st.brightness - 15) }
function contrastUp() { st.contrast = Math.min(300, st.contrast + 15) }
function contrastDown() { st.contrast = Math.max(20, st.contrast - 15) }
function reset() { resetState() }

function applyPanLimit() {
  if (st.zoom <= 1) { st.panX = 0; st.panY = 0 }
}

// Thumbnail source for progressive loading blur placeholder
const thumbSrc = computed(() => {
  void xrayVersion.value
  const img = props.images[currentIdx.value]
  if (!img) return ''
  if (typeof img === 'string') return img.startsWith('http') || img.startsWith('data:') ? '' : getThumbnailUrl(img)
  return img.key ? getThumbnailUrl(img.key) : ''
})

function onImageLoad() {
  imgLoading.value = false
  imgError.value = false
}

function onImageError() {
  imgLoading.value = false
  imgError.value = true
}

function goTo(i) {
  currentIdx.value = i
  resetState()
  loadCurrent()
  preloadAdjacent(props.images, i, imgSrc)
}

function onPointerDown(e) {
  if (st.zoom > 1 && e.target === imgEl.value) {
    st.dragging = true; st.lx = e.clientX; st.ly = e.clientY
    bodyEl.value?.setPointerCapture(e.pointerId)
  }
}
function onPointerMove(e) {
  if (!st.dragging) return
  st.panX += e.clientX - st.lx; st.panY += e.clientY - st.ly
  st.lx = e.clientX; st.ly = e.clientY
}
function onPointerUp() { st.dragging = false }
function onWheel(e) { e.deltaY < 0 ? zoomIn() : zoomOut() }

// ── Touch gestures (pinch-to-zoom + drag) ──
let _lastTouchDist = 0
let _lastTouchCenter = { x: 0, y: 0 }
let _touchCount = 0

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchCenter(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

function onTouchStart(e) {
  _touchCount = e.touches.length
  if (e.touches.length === 2) {
    _lastTouchDist = getTouchDist(e.touches)
    _lastTouchCenter = getTouchCenter(e.touches)
  } else if (e.touches.length === 1 && st.zoom > 1) {
    st.dragging = true
    st.lx = e.touches[0].clientX
    st.ly = e.touches[0].clientY
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    // Pinch to zoom
    const dist = getTouchDist(e.touches)
    const scale = dist / _lastTouchDist
    st.zoom = Math.max(0.5, Math.min(5, st.zoom * scale))
    _lastTouchDist = dist

    // Two-finger pan
    const center = getTouchCenter(e.touches)
    st.panX += center.x - _lastTouchCenter.x
    st.panY += center.y - _lastTouchCenter.y
    _lastTouchCenter = center
  } else if (e.touches.length === 1 && st.dragging) {
    st.panX += e.touches[0].clientX - st.lx
    st.panY += e.touches[0].clientY - st.ly
    st.lx = e.touches[0].clientX
    st.ly = e.touches[0].clientY
  }
}

function onTouchEnd(e) {
  if (e.touches.length < 2) _lastTouchDist = 0
  if (e.touches.length === 0) {
    st.dragging = false
    applyPanLimit()
  }
  _touchCount = e.touches.length
}

function close() {
  document.body.style.overflow = ''
  if (_popHandler) { window.removeEventListener('popstate', _popHandler); _popHandler = null }
  emit('close')
}

async function resolveFullBlob(im) {
  // Prefer an already-resolved src (data URL / blob URL / http) from the viewer,
  // otherwise fall back to the secure resolver which returns local IndexedDB data
  // when available or fetches the full image from R2.
  let src = imgSrc(im)
  if (!src) {
    const key = typeof im === 'string' ? im : im?.key
    if (key && !key.startsWith('http') && !key.startsWith('data:')) {
      src = await getImageSecure(key)
    }
  }
  if (!src) return null
  const res = await fetch(src)
  if (!res.ok) return null
  return res.blob()
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      // Filesystem.writeFile expects raw base64 without the data: URL prefix.
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Save to the device on native (Capacitor) using the Filesystem plugin, handling
// storage permissions explicitly so it no longer fails with a permission error.
async function saveImageNative(blob, filename) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const base64 = await blobToBase64(blob)
  // Request storage permission when the platform exposes it (Android < 11).
  try {
    const perm = await Filesystem.checkPermissions()
    if (perm?.publicStorage && perm.publicStorage !== 'granted') {
      const req = await Filesystem.requestPermissions()
      if (req?.publicStorage && req.publicStorage !== 'granted') {
        return { ok: false, denied: true }
      }
    }
  } catch { /* platform has no separate storage permission — continue */ }
  // Documents is user-visible (Files app) and works with scoped storage.
  const res = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  })
  return { ok: true, uri: res?.uri }
}

async function downloadCurrent() {
  if (downloading.value) return
  const im = props.images[currentIdx.value]
  if (!im) return
  downloading.value = true
  try {
    const blob = await resolveFullBlob(im)
    if (!blob || !blob.size) { toast('تعذّر تجهيز الصورة للتنزيل'); return }
    const ext = (blob.type && blob.type.includes('png')) ? 'png' : 'jpg'
    const safeName = (props.patientName || 'اشعة').replace(/[\\/:*?"<>|]+/g, '_')
    const filename = `${safeName}-${currentIdx.value + 1}.${ext}`

    const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
    if (isNative) {
      try {
        const result = await saveImageNative(blob, filename)
        if (result.ok) { toast('تم حفظ الصورة في المستندات'); return }
        if (result.denied) { toast('يلزم السماح بصلاحية التخزين لحفظ الصورة'); return }
      } catch {
        // fall through to share / anchor fallback below
      }
      // Fallback: native share sheet (lets the user save to gallery/files).
      try {
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename })
          return
        }
      } catch (e) {
        if (e?.name === 'AbortError') return // user cancelled
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => { try { URL.revokeObjectURL(url) } catch { /* ignore */ } }, 5000)
    toast('تم تنزيل الصورة')
  } catch {
    toast('تعذّر تنزيل الصورة')
  } finally {
    downloading.value = false
  }
}

function deleteCurrent() {
  if (!confirm('حذف هذه الصورة؟')) return
  emit('delete', currentIdx.value)
  if (currentIdx.value >= props.images.length - 1) currentIdx.value = Math.max(0, props.images.length - 2)
  if (!props.images.length) close()
}

// Keyboard navigation
function onKeydown(e) {
  if (!props.visible) return
  if (e.key === 'ArrowRight' && currentIdx.value > 0) goTo(currentIdx.value - 1)
  if (e.key === 'ArrowLeft' && currentIdx.value < props.images.length - 1) goTo(currentIdx.value + 1)
  if (e.key === 'Escape') close()
}

watch(() => props.visible, (v) => {
  if (v) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
}, { immediate: false })
</script>
