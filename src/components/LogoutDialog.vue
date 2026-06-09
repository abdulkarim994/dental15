<template>
  <Teleport to="body">
    <Transition name="lo-fade">
      <div v-if="visible" class="lo-overlay" @click.self="cancel">
        <div class="lo-popup glass">
          <!-- Header -->
          <div class="lo-header">
            <div class="lo-icon-wrap">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3 class="lo-title">تسجيل الخروج</h3>
            <button class="lo-close glass-sm" @click="cancel">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Pending uploads warning -->
          <div v-if="pendingCount > 0" class="lo-warn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>لديك <b>{{ pendingCount }}</b> {{ pendingCount === 1 ? 'صورة' : 'صور' }} بانتظار الرفع</span>
          </div>

          <!-- Actions for pending uploads -->
          <div v-if="pendingCount > 0" class="lo-actions">
            <button class="lo-btn lo-btn-upload" @click="$emit('upload')">
              <div class="lo-btn-icon lo-btn-icon-sync">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div class="lo-btn-text">
                <span class="lo-btn-label">رفع ثم خروج</span>
                <span class="lo-btn-sub">رفع الصور المعلقة قبل الخروج</span>
              </div>
            </button>

            <button class="lo-btn lo-btn-delete" @click="$emit('delete')">
              <div class="lo-btn-icon lo-btn-icon-del">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <div class="lo-btn-text">
                <span class="lo-btn-label">حذف وخروج</span>
                <span class="lo-btn-sub">حذف الصور المعلقة والخروج مباشرة</span>
              </div>
            </button>

            <button class="lo-btn lo-btn-stay" @click="cancel">
              <div class="lo-btn-icon lo-btn-icon-stay">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <div class="lo-btn-text">
                <span class="lo-btn-label">إلغاء</span>
                <span class="lo-btn-sub">البقاء في التطبيق</span>
              </div>
            </button>
          </div>

          <!-- Simple confirm for no pending uploads -->
          <div v-else class="lo-simple">
            <p class="lo-simple-msg">هل أنت متأكد من تسجيل الخروج؟</p>
            <p class="lo-simple-sub">سيتم مزامنة بياناتك قبل الخروج</p>
            <div class="lo-simple-btns">
              <button class="lo-sbtn lo-sbtn-cancel" @click="cancel">إلغاء</button>
              <button class="lo-sbtn lo-sbtn-confirm" @click="$emit('confirm')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  pendingCount: { type: Number, default: 0 },
})

const emit = defineEmits(['confirm', 'upload', 'delete', 'cancel'])

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.lo-overlay{
  position:fixed;inset:0;z-index:6000;
  background:rgba(4,9,24,.94);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  display:flex;align-items:center;justify-content:center;
  padding:16px;
  animation:lo-in .25s ease;
}
@keyframes lo-in{from{opacity:0}to{opacity:1}}

.lo-popup{
  width:100%;max-width:380px;
  padding:0;overflow:hidden;
  animation:lo-pop .35s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes lo-pop{from{opacity:0;transform:scale(.92) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}

.lo-header{
  display:flex;align-items:center;gap:10px;
  padding:20px 20px 16px;
  border-bottom:1px solid rgba(59,130,246,.12);
}
.lo-icon-wrap{
  width:48px;height:48px;
  display:flex;align-items:center;justify-content:center;
  border-radius:50%;
  background:rgba(255,68,85,.12);
  border:2px solid rgba(255,68,85,.3);
  color:var(--red);flex-shrink:0;
}
.lo-title{
  flex:1;margin:0;
  font-size:calc(15px * var(--fs,1));font-weight:800;
  color:var(--gold-l);
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-close{
  width:36px;height:36px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;border:none;padding:0;
  color:var(--gold-l);transition:color .2s;
}
.lo-close:hover{color:#fff}

.lo-warn{
  display:flex;align-items:center;gap:8px;
  margin:16px 20px 0;padding:10px 14px;border-radius:12px;
  background:rgba(255,149,0,.08);
  border:1px solid rgba(255,149,0,.22);
  font-size:calc(12px * var(--fs,1));
  color:var(--orange);
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-warn b{font-weight:800}

.lo-actions{
  padding:16px 20px 20px;
  display:flex;flex-direction:column;gap:8px;
}

.lo-btn{
  display:flex;align-items:center;gap:12px;
  width:100%;padding:14px 16px;
  border-radius:16px;
  border:1px solid rgba(59,130,246,.1);
  background:rgba(8,16,42,.6);
  cursor:pointer;text-align:right;
  transition:all .24s cubic-bezier(0.16,1,0.3,1);
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-btn:hover{
  border-color:rgba(59,130,246,.22);
  background:rgba(8,16,42,.95);
  transform:translateY(-1px);
  box-shadow:0 5px 20px rgba(0,0,0,.2);
}
.lo-btn:active{transform:scale(.98)}

.lo-btn-icon{
  width:42px;height:42px;
  display:flex;align-items:center;justify-content:center;
  border-radius:50%;flex-shrink:0;
  transition:all .2s;
}
.lo-btn-icon-sync{
  background:rgba(59,130,246,.1);
  border:1px solid rgba(59,130,246,.18);
  color:var(--gold-l);
}
.lo-btn-icon-del{
  background:rgba(255,68,85,.1);
  border:1px solid rgba(255,68,85,.2);
  color:var(--red);
}
.lo-btn-icon-stay{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1);
  color:rgba(221,228,240,.4);
}

.lo-btn-upload:hover .lo-btn-icon-sync{background:rgba(59,130,246,.2);box-shadow:0 2px 10px rgba(59,130,246,.2)}
.lo-btn-delete:hover .lo-btn-icon-del{background:rgba(255,68,85,.18);box-shadow:0 2px 10px rgba(255,68,85,.15)}
.lo-btn-stay:hover .lo-btn-icon-stay{background:rgba(255,255,255,.1)}

.lo-btn-text{flex:1;min-width:0}
.lo-btn-label{
  display:block;
  font-size:calc(13px * var(--fs,1));font-weight:700;
  color:#dde4f0;
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-btn-sub{
  display:block;margin-top:2px;
  font-size:calc(10px * var(--fs,1));
  color:rgba(221,228,240,.4);
  font-family:-apple-system,'Cairo',sans-serif;
}

.lo-simple{padding:20px;text-align:center}
.lo-simple-msg{
  font-size:calc(14px * var(--fs,1));font-weight:700;
  color:#dde4f0;margin:0 0 6px;
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-simple-sub{
  font-size:calc(11px * var(--fs,1));
  color:rgba(221,228,240,.4);margin:0 0 20px;
  font-family:-apple-system,'Cairo',sans-serif;
}
.lo-simple-btns{display:flex;gap:10px}
.lo-sbtn{
  flex:1;padding:12px 16px;
  border-radius:14px;
  font-size:calc(13px * var(--fs,1));font-weight:700;
  cursor:pointer;border:none;
  font-family:-apple-system,'Cairo',sans-serif;
  transition:all .22s;
  display:flex;align-items:center;justify-content:center;gap:6px;
}
.lo-sbtn-cancel{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.15);
  color:#dde4f0;
}
.lo-sbtn-cancel:hover{background:rgba(255,255,255,.12)}
.lo-sbtn-confirm{
  background:rgba(255,68,85,.15);
  border:1px solid rgba(255,68,85,.3);
  color:var(--red);
}
.lo-sbtn-confirm:hover{background:rgba(255,68,85,.25)}

.lo-fade-enter-active{transition:opacity .25s}
.lo-fade-leave-active{transition:opacity .2s}
.lo-fade-enter-from,.lo-fade-leave-to{opacity:0}
</style>

<style>
/* ── Light theme overrides ── */
body.light .lo-overlay{background:rgba(236,242,249,.98);backdrop-filter:blur(16px)}
body.light .lo-header{border-bottom-color:rgba(0,0,0,.08)}
body.light .lo-title{color:var(--gold-d)}
body.light .lo-close{color:var(--gold-d)}
body.light .lo-close:hover{color:#1a2a3a}
body.light .lo-icon-wrap{background:rgba(255,68,85,.08);border-color:rgba(255,68,85,.25)}
body.light .lo-warn{background:rgba(255,149,0,.06);border-color:rgba(255,149,0,.2);color:#b45309}
body.light .lo-btn{background:rgba(255,255,255,.7);border-color:rgba(0,0,0,.08)}
body.light .lo-btn:hover{background:rgba(255,255,255,.99);border-color:rgba(59,130,246,.3);box-shadow:0 5px 16px rgba(0,0,0,.1)}
body.light .lo-btn-label{color:#1a2a3a}
body.light .lo-btn-sub{color:rgba(26,42,58,.45)}
body.light .lo-btn-icon-sync{background:rgba(59,130,246,.08);color:var(--gold-d);border-color:rgba(59,130,246,.2)}
body.light .lo-btn-icon-del{background:rgba(255,68,85,.05);color:#dc2626;border-color:rgba(255,68,85,.18)}
body.light .lo-btn-icon-stay{background:rgba(0,0,0,.04);color:rgba(26,42,58,.35);border-color:rgba(0,0,0,.1)}
body.light .lo-btn-upload:hover .lo-btn-icon-sync{background:rgba(59,130,246,.16)}
body.light .lo-btn-delete:hover .lo-btn-icon-del{background:rgba(255,68,85,.12)}
body.light .lo-btn-stay:hover .lo-btn-icon-stay{background:rgba(0,0,0,.08)}
body.light .lo-simple-msg{color:#1a2a3a}
body.light .lo-simple-sub{color:rgba(26,42,58,.5)}
body.light .lo-sbtn-cancel{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.12);color:#2a3a4a}
body.light .lo-sbtn-cancel:hover{background:rgba(0,0,0,.08)}
body.light .lo-sbtn-confirm{background:rgba(255,68,85,.06);border-color:rgba(255,68,85,.2);color:#dc2626}
body.light .lo-sbtn-confirm:hover{background:rgba(255,68,85,.15)}
</style>
