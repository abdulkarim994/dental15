/**
 * PDF / Print Service
 *
 * Handles printing across platforms:
 * - Native (Android/iOS): Uses @capgo/capacitor-printer to open the native print dialog
 *   with a clean B&W professional HTML layout
 * - Web: Falls back to window.print() via a popup window
 */

import { Capacitor } from '@capacitor/core'

export function isNative() {
  return Capacitor.isNativePlatform()
}

const BW_STYLES = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#000;
    background:#fff;padding:16px;font-size:12px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact
  }
  h1{text-align:center;font-size:18px;color:#000;margin-bottom:2px;font-weight:900}
  .sub{text-align:center;font-size:10px;color:#555;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  thead tr{background:#000;color:#fff}
  th{padding:6px 8px;text-align:right;font-weight:700;font-size:10px;border:1px solid #000}
  td{padding:5px 8px;border:1px solid #ccc;text-align:right;font-size:10px}
  tr:nth-child(even) td{background:#f5f5f5}
  .total-row td{font-weight:800;background:#e8e8e8;border-top:2px solid #000}
  .sec-title{
    background:#000;color:#fff;padding:5px 12px;font-size:10px;
    font-weight:700;margin:10px 0 0;display:flex;align-items:center;gap:6px
  }
  .sec-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5)}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#ccc;margin-bottom:1px}
  .info-cell{background:#fff;padding:6px 10px}
  .info-cell .lbl{font-size:7px;color:#777;font-weight:700;text-transform:uppercase}
  .info-cell .val{font-size:11px;font-weight:700;color:#000;border-bottom:1px solid #ccc;min-height:16px;padding-bottom:1px}
  .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px 0}
  .sum-card{border:1.5px solid #000;border-radius:4px;padding:8px 6px;text-align:center}
  .sum-card .lbl{font-size:7px;color:#555;font-weight:600;margin-bottom:2px}
  .sum-card .val{font-size:16px;font-weight:900;color:#000}
  .sum-card .unit{font-size:7px;color:#888}
  .debt-footer{background:#f0f0f0;border:2px solid #000;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:6px}
  .debt-footer .lbl{font-size:10px;font-weight:700}
  .debt-footer .val{font-size:16px;font-weight:900}
  .sig-row{display:flex;justify-content:space-around;padding:14px 20px;border-top:1px solid #ccc;margin-top:10px}
  .sig-box{text-align:center;flex:1;padding:0 6px}
  .sig-line{border-bottom:1px solid #000;margin:0 6px 3px;height:20px}
  .sig-lbl{font-size:8px;color:#555;font-weight:600}
  .footer{text-align:center;font-size:8px;color:#999;margin-top:12px;border-top:1px solid #ddd;padding-top:6px}
  .accent-bar{height:4px;background:#000;margin-bottom:0}
  .header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1.5px solid #000}
  .header-right{display:flex;align-items:center;gap:10px}
  .clinic-name{font-size:17px;font-weight:900;color:#000;line-height:1.1}
  .clinic-sub{font-size:9px;color:#555;margin-top:2px}
  .header-left{text-align:left;border:1px solid #000;border-radius:4px;padding:6px 10px}
  .header-left .lbl{font-size:7px;color:#777;font-weight:600}
  .header-left .val{font-size:10px;font-weight:700;color:#000}
  .pros-td{font-weight:700}
  .inst-row td{background:#f8f8f8;font-size:9px;color:#666;padding:3px 8px}
  .report-box{border:2px solid #000;border-radius:4px;padding:8px;text-align:center;margin:8px 0}
  .report-box .lbl{font-size:9px;color:#555}
  .report-box .val{font-size:20px;font-weight:900;color:#000}
  @media print{
    body{padding:0}
    @page{size:A4;margin:12mm}
  }
</style>`

/**
 * Build a B&W letterhead header block.
 * @param {Object} opts - { clinicName, logo }
 */
export function buildLetterhead({ clinicName = '', logo = '' } = {}) {
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const name = _esc(clinicName || 'عيادة الأسنان')
  const logoBlock = logo
    ? `<img src="${_esc(logo)}" style="max-height:44px;max-width:90px;object-fit:contain" onerror="this.style.display='none'">`
    : `<div style="width:40px;height:40px;border-radius:50%;border:2px solid #000;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"><path d="M12 2C8.5 2 7 4.5 7 7c0 3 1.5 6 2 9 .3 2 .7 4 1 5h4c.3-1 .7-3 1-5 .5-3 2-6 2-9 0-2.5-1.5-5-5-5z"/></svg>
      </div>`
  return `<div class="accent-bar"></div>
<div class="header">
  <div class="header-right">${logoBlock}<div><div class="clinic-name">${name}</div><div class="clinic-sub">تقرير رسمي</div></div></div>
  <div class="header-left"><div class="lbl">تاريخ التقرير</div><div class="val">${_esc(today)}</div></div>
</div>`
}

/**
 * Wrap HTML content in a B&W professional print-ready document.
 * @param {string} bodyHtml
 * @param {string} title
 * @param {Object} clinic - { clinicName, logo }
 */
export function buildBwDocument(bodyHtml, title = '', clinic = {}) {
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const letterhead = buildLetterhead(clinic)
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_esc(title)}</title>
${BW_STYLES}
</head><body>
${letterhead}
${bodyHtml}
<div class="footer">${_esc(clinic.clinicName || 'عيادة الأسنان')} — ${_esc(today)}</div>
</body></html>`
}

function _esc(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Print HTML using the native print dialog on Android/iOS,
 * or window.print() on web.
 */
export async function nativePrint(htmlDocument, title = '') {
  if (isNative()) {
    const { Printer } = await import('@capgo/capacitor-printer')
    await Printer.printHtml({
      name: title || 'تقرير',
      html: htmlDocument,
    })
  } else {
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(htmlDocument)
      w.document.close()
      setTimeout(() => { try { w.print() } catch (_) {} }, 600)
    } else {
      window.print()
    }
  }
}
