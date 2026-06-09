import { ref } from 'vue'

const isLight = ref(localStorage.getItem('dental_theme') === 'light')
const fontSizeClass = ref(localStorage.getItem('dental_fs') || 'fs-medium')

let StatusBar = null
let Style = null
try {
  const mod = await import('@capacitor/status-bar')
  StatusBar = mod.StatusBar
  Style = mod.Style
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
} catch (_) { /* not available in web */ }

export function useTheme() {
  function applyTheme(light) {
    isLight.value = light
    document.body.classList.toggle('light', light)
    localStorage.setItem('dental_theme', light ? 'light' : 'dark')
    // Meta theme-color for browser / fallback
    const themeColor = light ? '#F0F5FB' : '#040918'
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta) }
    meta.content = themeColor
    // Native Android status bar
    if (StatusBar) {
      StatusBar.setBackgroundColor({ color: themeColor }).catch(() => {})
      StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {})
    }
  }

  function applyFontSize(cls) {
    fontSizeClass.value = cls
    document.body.classList.remove('fs-small', 'fs-medium', 'fs-large', 'fs-xlarge')
    document.body.classList.add(cls)
    localStorage.setItem('dental_fs', cls)
  }

  function initTheme() {
    applyTheme(isLight.value)
    applyFontSize(fontSizeClass.value)
  }

  function toggleTheme() {
    applyTheme(!isLight.value)
  }

  return {
    isLight,
    fontSizeClass,
    applyTheme,
    applyFontSize,
    initTheme,
    toggleTheme,
  }
}
