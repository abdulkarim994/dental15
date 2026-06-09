<template>
  <Teleport to="body">
    <Transition name="pu-fade">
      <div v-if="visible" class="pu-overlay" @click.self="$emit('close')">
        <div class="pu-popup glass">
          <div class="pu-header">
            <h3 class="pu-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              صور بانتظار الرفع
              <span class="pu-count">{{ items.length }}</span>
            </h3>
            <button class="pu-close glass-sm" @click="$emit('close')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div v-if="items.length" class="pu-actions">
            <button class="btn-g pu-btn" :disabled="syncing" @click="syncAll">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :class="{ 'pu-spin': syncing }"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
              رفع الكل
            </button>
            <button class="pu-btn pu-btn-del" :disabled="syncing" @click="deleteAll">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              حذف الكل
            </button>
          </div>

          <div v-if="syncing" class="pu-progress">
            <div class="pu-progress-bar" :style="{ width: progressPct + '%' }"></div>
            <span class="pu-progress-text">{{ progressText }}</span>
          </div>

          <div class="pu-list" v-if="items.length">
            <div v-for="item in items" :key="item.id" class="pu-item">
              <div class="pu-thumb">
                <img v-if="item.compressedDataUrl" :src="item.compressedDataUrl" alt="" />
                <div v-else class="pu-no-thumb">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
              </div>
              <div class="pu-info">
                <p class="pu-name">{{ item.patientName || 'مريض' }}</p>
                <p class="pu-file">{{ item.fileName || extractName(item.id) }}</p>
                <p class="pu-date">{{ formatDate(item.ts) }}</p>
              </div>
              <div class="pu-item-actions">
                <button class="pu-ibtn pu-ibtn-sync" title="رفع" :disabled="syncing" @click="syncOne(item)">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
                </button>
                <button class="pu-ibtn pu-ibtn-del" title="حذف" :disabled="syncing" @click="deleteOne(item.id)">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="pu-empty">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold);opacity:.25"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>لا توجد صور معلقة</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getUploadQueue, uploadSinglePending, removeSinglePending, removeAllPending, refreshPendingCount } from '@/services/image.service'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

const props = defineProps({
  visible: { type: Boolean, default: false },
})

defineEmits(['close'])

const items = ref([])
const syncing = ref(false)
const progressPct = ref(0)
const progressText = ref('')

watch(() => props.visible, async (v) => {
  if (v) await loadItems()
})

async function loadItems() {
  try {
    items.value = await getUploadQueue()
  } catch {
    items.value = []
  }
}

function extractName(id) {
  if (!id) return ''
  const parts = id.split('/')
  return parts[parts.length - 1] || id
}

function formatDate(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

async function syncOne(item) {
  if (syncing.value) return
  syncing.value = true
  progressText.value = 'جار رفع الصورة...'
  progressPct.value = 50
  try {
    await uploadSinglePending(item)
    toast('تم رفع الصورة بنجاح')
    await loadItems()
  } catch {
    toast('فشل رفع الصورة — تأكد من الاتصال')
  } finally {
    syncing.value = false
    progressPct.value = 0
  }
}

async function deleteOne(id) {
  try {
    await removeSinglePending(id)
    await loadItems()
    toast('تم حذف الصورة من قائمة الانتظار')
  } catch {
    toast('فشل الحذف')
  }
}

async function syncAll() {
  if (syncing.value || !items.value.length) return
  syncing.value = true
  const total = items.value.length
  progressPct.value = 0
  progressText.value = `جار رفع 0 / ${total}...`
  try {
    let done = 0
    const pending = [...items.value]
    for (const item of pending) {
      try {
        await uploadSinglePending(item)
        done++
      } catch { /* skip */ }
      progressPct.value = Math.round((done / total) * 100)
      progressText.value = `جار رفع ${done} / ${total}...`
    }
    if (done === 0) {
      toast('لم يتم رفع أي صورة — تأكد من الاتصال')
    } else if (done === total) {
      toast('تم رفع جميع الصور')
    } else {
      toast(`تم رفع ${done} من ${total} — البقية بانتظار الاتصال`)
    }
    await loadItems()
  } finally {
    syncing.value = false
    progressPct.value = 0
  }
}

async function deleteAll() {
  if (syncing.value) return
  if (!confirm('حذف جميع الصور المعلقة؟ لن يمكن استرجاعها.')) return
  try {
    await removeAllPending()
    items.value = []
    toast('تم حذف جميع الصور المعلقة')
  } catch {
    toast('فشل الحذف')
  }
}
</script>

<style scoped>
.pu-overlay {
  position:fixed;inset:0;z-index:9999;
  background:rgba(6,12,26,.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  display:flex;align-items:flex-start;justify-content:center;
  padding-top:56px;
}
.pu-popup {
  width:92%;max-width:420px;max-height:78vh;
  display:flex;flex-direction:column;overflow:hidden;
}
.pu-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 18px;border-bottom:1px solid rgba(59,130,246,.12);
}
.pu-title {
  font-size:calc(14px * var(--fs,1));font-weight:800;
  color:var(--gold-l);margin:0;
  font-family:-apple-system,'Cairo',sans-serif;
  display:flex;align-items:center;gap:8px;
}
.pu-count {
  display:inline-flex;align-items:center;justify-content:center;
  min-width:22px;height:22px;
  background:linear-gradient(135deg,#f59e0b,#d97706);
  color:#fff;border-radius:11px;font-size:10px;font-weight:800;
  padding:0 6px;box-shadow:0 2px 8px rgba(245,158,11,.3);
}
.pu-close {
  width:36px;height:36px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--gold-l);padding:0;
}
.pu-close:hover { color:#fff; }

.pu-actions {
  display:flex;gap:8px;padding:12px 18px;
  border-bottom:1px solid rgba(59,130,246,.08);
}
.pu-btn {
  flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:9px 14px;border-radius:50px;border:none;
  font-size:calc(12px * var(--fs,1));font-weight:700;cursor:pointer;
  font-family:-apple-system,'Cairo',sans-serif;
  transition:all .28s cubic-bezier(0.16,1,0.3,1);
}
.pu-btn:disabled { opacity:.35;cursor:not-allowed; }
.pu-btn-del {
  background:rgba(255,68,85,.08);color:var(--red);
  border:1px solid rgba(255,68,85,.2);
}
.pu-btn-del:hover:not(:disabled) { background:rgba(255,68,85,.15); }

.pu-progress {
  position:relative;height:6px;
  background:rgba(59,130,246,.08);
  margin:0 18px 10px;border-radius:3px;overflow:hidden;
}
.pu-progress-bar {
  height:100%;background:var(--gold-g);border-radius:3px;
  transition:width .4s;
}
.pu-progress-text {
  position:absolute;top:10px;left:0;right:0;
  text-align:center;font-size:calc(10px * var(--fs,1));
  color:var(--gold-l);font-weight:600;
  font-family:-apple-system,'Cairo',sans-serif;
}

.pu-list { overflow-y:auto;flex:1;padding:8px 14px 14px; }
.pu-item {
  display:flex;align-items:center;gap:12px;
  padding:12px;border-radius:16px;
  background:rgba(8,16,42,.6);margin-bottom:8px;
  border:1px solid rgba(59,130,246,.1);
  transition:border-color .2s;
}
.pu-item:hover { border-color:rgba(59,130,246,.22); }

.pu-thumb {
  width:48px;height:48px;border-radius:12px;overflow:hidden;flex-shrink:0;
  background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.12);
}
.pu-thumb img { width:100%;height:100%;object-fit:cover; }
.pu-no-thumb {
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
}
.pu-info { flex:1;min-width:0; }
.pu-name {
  font-size:calc(12px * var(--fs,1));font-weight:700;color:var(--gold-l);
  margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font-family:-apple-system,'Cairo',sans-serif;
}
.pu-file {
  font-size:calc(10px * var(--fs,1));color:rgba(221,228,240,.4);
  margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.pu-date {
  font-size:calc(9px * var(--fs,1));color:rgba(221,228,240,.22);margin:2px 0 0;
}

.pu-item-actions { display:flex;gap:6px;flex-shrink:0; }
.pu-ibtn {
  width:34px;height:34px;border-radius:12px;border:none;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:all .2s;
}
.pu-ibtn:disabled { opacity:.25;cursor:not-allowed; }
.pu-ibtn-sync {
  background:rgba(59,130,246,.1);color:var(--gold-l);
  border:1px solid rgba(59,130,246,.18);
}
.pu-ibtn-sync:hover:not(:disabled) {
  background:rgba(59,130,246,.2);box-shadow:0 2px 10px rgba(59,130,246,.2);
}
.pu-ibtn-del {
  background:rgba(255,68,85,.06);color:var(--red);
  border:1px solid rgba(255,68,85,.15);
}
.pu-ibtn-del:hover:not(:disabled) {
  background:rgba(255,68,85,.14);box-shadow:0 2px 10px rgba(255,68,85,.15);
}

.pu-empty {
  padding:48px 20px;text-align:center;
}
.pu-empty p {
  margin:12px 0 0;font-size:calc(13px * var(--fs,1));
  color:rgba(221,228,240,.3);font-weight:600;
  font-family:-apple-system,'Cairo',sans-serif;
}

.pu-spin { animation:pu-spin .8s linear infinite; }
@keyframes pu-spin { to { transform:rotate(360deg) } }

.pu-fade-enter-active,.pu-fade-leave-active { transition:opacity .25s; }
.pu-fade-enter-from,.pu-fade-leave-to { opacity:0; }
</style>

<style>
/* ── Light theme overrides ── */
body.light .pu-overlay{background:rgba(236,242,249,.82)}
body.light .pu-header{border-bottom-color:rgba(0,0,0,.08)}
body.light .pu-title{color:var(--gold-d)}
body.light .pu-close{color:var(--gold-d)}
body.light .pu-close:hover{color:#1a2a3a}
body.light .pu-actions{border-bottom-color:rgba(0,0,0,.06)}
body.light .pu-btn-del{background:rgba(255,68,85,.06);border-color:rgba(255,68,85,.18);color:#dc2626}
body.light .pu-btn-del:hover:not(:disabled){background:rgba(255,68,85,.12)}
body.light .pu-progress{background:rgba(0,0,0,.06)}
body.light .pu-progress-text{color:var(--gold-d)}
body.light .pu-item{background:rgba(255,255,255,.7);border-color:rgba(0,0,0,.08)}
body.light .pu-item:hover{border-color:rgba(59,130,246,.3)}
body.light .pu-thumb{background:rgba(59,130,246,.05);border-color:rgba(0,0,0,.08)}
body.light .pu-name{color:var(--gold-d)}
body.light .pu-file{color:rgba(26,42,58,.45)}
body.light .pu-date{color:rgba(26,42,58,.3)}
body.light .pu-ibtn-sync{background:rgba(59,130,246,.08);color:var(--gold-d);border-color:rgba(59,130,246,.2)}
body.light .pu-ibtn-sync:hover:not(:disabled){background:rgba(59,130,246,.16)}
body.light .pu-ibtn-del{background:rgba(255,68,85,.05);color:#dc2626;border-color:rgba(255,68,85,.18)}
body.light .pu-ibtn-del:hover:not(:disabled){background:rgba(255,68,85,.12)}
body.light .pu-empty{color:rgba(26,42,58,.3)}
body.light .pu-empty p{color:rgba(26,42,58,.35)}
</style>
