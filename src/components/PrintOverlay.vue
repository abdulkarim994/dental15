<template>
  <Teleport to="body">
    <div v-if="visible" class="print-overlay active" id="_printArea">
      <div class="pov-bar no-print">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <button class="pov-btn-back" @click="close">← رجوع</button>
          <h2 style="margin:0;font-size:13px;font-weight:700;font-family:'Cairo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>
            {{ title }}
          </h2>
        </div>
        <button class="pov-btn-print" @click="doPrint" :disabled="pdfBusy">
          <span v-if="pdfBusy" class="pov-spinner"></span>
          <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          {{ pdfBusy ? 'جاري التحويل...' : 'طباعة / PDF' }}
        </button>
      </div>
      <div class="pov-content" v-html="styledContent"></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { escapeHtml } from '@/utils/sanitize'
import { isNative, buildBwDocument, nativePrint } from '@/services/pdf.service'
import { useAppStore } from '@/stores/app.store'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  html: { type: String, default: '' },
})
const emit = defineEmits(['close'])
const app = useAppStore()
const pdfBusy = ref(false)

const printStyles = `
<style>
  .pov-content h1{text-align:center;font-size:20px;color:#0a1428;margin-bottom:4px;font-family:'Cairo',sans-serif}
  .pov-content .sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px;font-family:'Cairo',sans-serif}
  .pov-content table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;font-family:'Cairo',sans-serif}
  .pov-content th{background:#0a1428;color:#fff;padding:8px 10px;text-align:right;font-weight:700}
  .pov-content td{padding:7px 10px;border-bottom:1px solid #eee;text-align:right}
  .pov-content tr:nth-child(even) td{background:#f9f9f9}
  .pov-content .total-row td{font-weight:800;background:#EEF3FB;font-size:13px}
  .pov-content .pros-td{color:#3B82F6;font-weight:700}
  .pov-content .sec-title{background:#0a1428;color:#fff;padding:5px 12px;font-size:10px;font-weight:700;margin:10px 0 0;display:flex;align-items:center;gap:6px}
  .pov-content .sec-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)}
  .pov-content .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ccc;margin-bottom:1px}
  .pov-content .info-cell{background:#fff;padding:6px 10px}
  .pov-content .info-cell .lbl{font-size:8px;color:#777;font-weight:700}
  .pov-content .info-cell .val{font-size:12px;font-weight:700;color:#0a1428;border-bottom:1px solid #ccc;min-height:16px;padding-bottom:1px}
  .pov-content .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px 0}
  .pov-content .sum-card{border:1.5px solid #0a1428;border-radius:4px;padding:8px 6px;text-align:center}
  .pov-content .sum-card .lbl{font-size:8px;color:#555;font-weight:600;margin-bottom:2px}
  .pov-content .sum-card .val{font-size:16px;font-weight:900;color:#0a1428}
  .pov-content .sum-card .unit{font-size:8px;color:#888}
  .pov-content .debt-footer{background:#f5f5f5;border:2px solid #0a1428;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:6px}
  .pov-content .debt-footer .lbl{font-size:10px;font-weight:700}
  .pov-content .debt-footer .val{font-size:16px;font-weight:900}
  .pov-content .sig-row{display:flex;justify-content:space-around;padding:14px 20px;border-top:1px solid #ccc;margin-top:10px}
  .pov-content .sig-box{text-align:center;flex:1;padding:0 6px}
  .pov-content .sig-line{border-bottom:1px solid #0a1428;margin:0 6px 3px;height:20px}
  .pov-content .sig-lbl{font-size:9px;color:#555;font-weight:600}
</style>`

function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<iframe[^>]*>/gi, '')
    .replace(/<object[^>]*>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
}

const styledContent = computed(() => {
  const today = new Date().toLocaleDateString('ar')
  const safeHtml = sanitizeHtml(props.html)
  return printStyles + safeHtml + `<div class="pov-footer">نظام طب الأسنان الرقمي — ${escapeHtml(today)}</div>`
})

function close() { emit('close') }

function _buildFullPage(content) {
  const today = new Date().toLocaleDateString('ar')
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap">
<title>${escapeHtml(props.title || '')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#0f172a;background:#fff;padding:16px}
h1{text-align:center;font-size:20px;color:#0a1428;margin-bottom:4px}
.sub{text-align:center;font-size:11px;color:#888;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
th{background:#0a1428;color:#fff;padding:8px 10px;text-align:right;font-weight:700}
td{padding:7px 10px;border-bottom:1px solid #eee;text-align:right}
tr:nth-child(even) td{background:#f9f9f9}
.total-row td{font-weight:800;background:#EEF3FB;font-size:13px}
.pros-td{color:#3B82F6;font-weight:700}
.pov-footer{text-align:center;font-size:10px;color:#aaa;margin-top:20px;border-top:1px solid #eee;padding-top:10px}
.print-bar{text-align:center;padding:14px;background:#f8faff;border-bottom:1px solid #e2e8f0;margin:-16px -16px 16px}
.print-bar button{background:#3B82F6;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif}
.print-bar button:active{opacity:.8}
@media print{.print-bar{display:none!important}@page{size:A4;margin:15mm}}
</style></head><body>
<div class="print-bar"><button onclick="window.print()">🖨️ طباعة / PDF</button></div>
${content}
<div class="pov-footer">نظام طب الأسنان الرقمي — ${escapeHtml(today)}</div>
</body></html>`
}

async function doPrint() {
  const safeHtml = sanitizeHtml(props.html)
  pdfBusy.value = true

  try {
    if (isNative()) {
      const clinic = { clinicName: app.config.centerName, logo: app.config.logo }
      const bwDoc = buildBwDocument(safeHtml, props.title || '', clinic)
      await nativePrint(bwDoc, props.title || '')
    } else {
      const fullPage = _buildFullPage(safeHtml)
      await nativePrint(fullPage, props.title || '')
    }
  } catch (e) {
    console.error('Print failed:', e)
  } finally {
    pdfBusy.value = false
  }
}
</script>
