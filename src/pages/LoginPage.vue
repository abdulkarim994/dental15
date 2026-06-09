<template>
  <div class="login-bg">
    <div class="login-card glass w-full space-y-6" style="max-width:360px;padding:32px 28px 28px">
      <div class="text-center space-y-4">
        <img
          src="/app-icon.png"
          alt="طب الأسنان الرقمي"
          class="mx-auto"
          style="width:92px;height:92px;border-radius:26px;box-shadow:0 18px 52px rgba(37,99,235,.32),0 3px 0 rgba(255,255,255,.8) inset;object-fit:cover"
        />
        <div>
          <h1 class="font-black text-2xl leading-tight tracking-tight" style="color:var(--gold)">طب الأسنان الرقمي</h1>
          <p class="text-[11px] opacity-35 mt-1 tracking-wide">نظام إدارة العيادة المتكامل</p>
        </div>
      </div>

      <div class="space-y-2.5">
        <input
          v-model="email"
          type="email"
          class="inp"
          placeholder="البريد الإلكتروني"
          autocomplete="email"
          style="text-align:right;direction:rtl"
        >
        <input
          v-model="password"
          type="password"
          class="inp"
          placeholder="كلمة المرور"
          autocomplete="current-password"
          style="text-align:right;direction:rtl;letter-spacing:.12em"
          @keydown.enter="handleLogin"
        >
        <div class="flex items-center justify-between px-1 pt-1">
          <div>
            <p class="text-xs font-semibold opacity-60">تذكّر بيانات الدخول</p>
            <p class="text-[9px] opacity-30">سيحفظ جهازك كلمة المرور</p>
          </div>
          <label class="tgl"><input v-model="remember" type="checkbox"><span class="tgl-s" /></label>
        </div>
        <div v-if="errorMsg" class="text-red-400 text-xs text-center py-1">{{ errorMsg }}</div>
      </div>

      <button class="btn-g w-full py-3.5 text-sm font-black tracking-wide" :disabled="loading" @click="handleLogin">
        {{ loading ? 'جار الدخول...' : 'تسجيل الدخول' }}
      </button>

      <div class="text-center">
        <button class="text-xs opacity-35 hover:opacity-65 transition-opacity" @click="showRegister = !showRegister">
          إنشاء حساب جديد
        </button>
      </div>

      <div v-if="showRegister" class="space-y-3 pt-4" style="border-top:1px solid rgba(255,255,255,.08)">
        <p class="text-xs text-center opacity-45 font-bold">إنشاء حساب جديد</p>
        <input
          v-model="regEmail"
          type="email"
          class="inp"
          placeholder="البريد الإلكتروني"
          autocomplete="email"
        >
        <input
          v-model="regPassword"
          type="password"
          class="inp"
          placeholder="كلمة المرور (6 أحرف+)"
          autocomplete="new-password"
        >
        <button class="btn-o w-full py-3 text-sm" :disabled="loading" @click="handleRegister">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          إنشاء الحساب
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import { verifyIDBOwnership } from '@/services/cache.service'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { toast } = useToast()

const email = ref('')
const password = ref('')
const remember = ref(true)
const errorMsg = ref('')
const loading = ref(false)
const showRegister = ref(false)
const regEmail = ref('')
const regPassword = ref('')

// Rate limiting — prevent rapid login/register attempts
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60000
let _attemptCount = 0
let _firstAttemptTs = 0
let _lockedUntil = 0

function checkRateLimit() {
  const now = Date.now()
  if (now < _lockedUntil) {
    const secs = Math.ceil((_lockedUntil - now) / 1000)
    errorMsg.value = `محاولات كثيرة — انتظر ${secs} ثانية`
    return false
  }
  if (now - _firstAttemptTs > LOCKOUT_MS) {
    _attemptCount = 0
    _firstAttemptTs = now
  }
  _attemptCount++
  if (_attemptCount > MAX_ATTEMPTS) {
    _lockedUntil = now + LOCKOUT_MS
    _attemptCount = 0
    errorMsg.value = 'محاولات كثيرة — انتظر دقيقة'
    return false
  }
  return true
}

async function handleLogin() {
  errorMsg.value = ''
  if (!checkRateLimit()) return
  const em = email.value.trim()
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    errorMsg.value = 'يرجى إدخال بريد إلكتروني صحيح'
    return
  }
  if (!password.value || password.value.length < 6) {
    errorMsg.value = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    return
  }
  loading.value = true
  try {
    await authStore.doLogin(em, password.value, remember.value)
    // Clear IDB if different user than last session
    const lastUid = localStorage.getItem('dental_last_uid')
    if (!lastUid || lastUid !== authStore.uid) {
      await appStore.clearLocalData(authStore.uid)
    }
    await verifyIDBOwnership(authStore.uid)
    localStorage.setItem('dental_last_uid', authStore.uid)
    // 1. Load from IndexedDB first (offline-first, fast)
    await appStore.loadFromCacheAsync(authStore.uid)
    // 2. If online, sync from Supabase in background
    if (navigator.onLine !== false) {
      try {
        await Promise.race([
          appStore.syncLoad(authStore.uid),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
        ])
      } catch {
        // fallback to local cache — already loaded above
      }
      appStore.saveToCache(authStore.uid)
    }
    router.push({ name: 'home' })
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!checkRateLimit()) return
  const em = regEmail.value.trim()
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    toast('يرجى إدخال بريد إلكتروني صحيح')
    return
  }
  if (!regPassword.value || regPassword.value.length < 6) {
    toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    return
  }
  loading.value = true
  try {
    await authStore.doRegister(em, regPassword.value)
    toast('تم إنشاء الحساب — تحقق من بريدك')
  } catch (e) {
    toast(e.message)
  } finally {
    loading.value = false
  }
}
</script>
