/**
 * Secure Storage Service
 * Uses Web Crypto API (AES-GCM) for encrypting sensitive data at rest.
 * Key is stored in IndexedDB (harder for XSS to access than localStorage)
 * and generated as non-extractable when possible.
 * Falls back to base64 encoding if Web Crypto is unavailable.
 * Zero external dependencies.
 */

const SECURE_PREFIX = '_ds_'
const CRYPTO_KEY_NAME = '_ds_ck'
const IDB_KEY_STORE = '_ds_keystore'
const IDB_KEY_ID = 'master'
const IDB_SECURE_STORE = '_ds_secure_data'

let _cryptoKey = null
let _cryptoReady = false

// ── IndexedDB key storage (more secure than localStorage) ──

function _openKeyDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_KEY_STORE, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function _saveKeyToIDB(keyData) {
  try {
    const db = await _openKeyDB()
    const tx = db.transaction('keys', 'readwrite')
    tx.objectStore('keys').put({ id: IDB_KEY_ID, key: keyData })
    return new Promise((resolve) => { tx.oncomplete = resolve })
  } catch { /* ignore */ }
}

async function _getKeyFromIDB() {
  try {
    const db = await _openKeyDB()
    const tx = db.transaction('keys', 'readonly')
    const req = tx.objectStore('keys').get(IDB_KEY_ID)
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.key || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

// ── Key derivation ──

async function getDerivedKey() {
  if (_cryptoKey) return _cryptoKey
  if (!globalThis.crypto?.subtle) return null

  try {
    // 1. Try IndexedDB first (new secure path)
    const idbKeyData = await _getKeyFromIDB()
    if (idbKeyData) {
      const raw = Uint8Array.from(atob(idbKeyData), c => c.charCodeAt(0))
      _cryptoKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
      _cryptoReady = true
      return _cryptoKey
    }

    // 2. Migrate from localStorage if exists (backward compatibility)
    const stored = localStorage.getItem(CRYPTO_KEY_NAME)
    if (stored) {
      const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      _cryptoKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
      // Migrate to IndexedDB and remove from localStorage
      await _saveKeyToIDB(stored)
      localStorage.removeItem(CRYPTO_KEY_NAME)
      _cryptoReady = true
      return _cryptoKey
    }

    // 3. Generate new key (non-extractable in memory, but we store raw for persistence)
    const tempKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    const exported = await crypto.subtle.exportKey('raw', tempKey)
    const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
    await _saveKeyToIDB(b64)
    // Re-import as non-extractable for runtime use
    _cryptoKey = await crypto.subtle.importKey('raw', new Uint8Array(exported), 'AES-GCM', false, ['encrypt', 'decrypt'])
    _cryptoReady = true
    return _cryptoKey
  } catch {
    return null
  }
}

// Initialize key on load
getDerivedKey().catch(() => {})

// ── AES-GCM encrypt/decrypt ──

async function aesEncrypt(plaintext) {
  const key = await getDerivedKey()
  if (!key) return null
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function aesDecrypt(encryptedB64) {
  const key = await getDerivedKey()
  if (!key) return null
  const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ── Fallback (base64) ──

function b64Encode(value) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(value)))
  } catch {
    return null
  }
}

function b64Decode(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)))
  } catch {
    return null
  }
}

// ── IndexedDB secure data storage ──

function _openSecureDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_SECURE_STORE, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function _idbSecureSet(key, value) {
  try {
    const db = await _openSecureDB()
    const tx = db.transaction('data', 'readwrite')
    tx.objectStore('data').put({ id: key, value })
    return new Promise((resolve) => { tx.oncomplete = resolve })
  } catch { /* ignore */ }
}

async function _idbSecureGet(key) {
  try {
    const db = await _openSecureDB()
    const tx = db.transaction('data', 'readonly')
    const req = tx.objectStore('data').get(key)
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.value || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function _idbSecureRemove(key) {
  try {
    const db = await _openSecureDB()
    const tx = db.transaction('data', 'readwrite')
    tx.objectStore('data').delete(key)
    return new Promise((resolve) => { tx.oncomplete = resolve })
  } catch { /* ignore */ }
}

// ── Public API ──

export async function secureSet(key, value) {
  try {
    const json = JSON.stringify(value)
    let stored = null
    if (_cryptoReady) {
      stored = await aesEncrypt(json)
      if (stored) stored = 'E:' + stored
    }
    if (!stored) {
      stored = 'B:' + b64Encode(value)
    }
    await _idbSecureSet(SECURE_PREFIX + key, stored)
    try { localStorage.removeItem(SECURE_PREFIX + key) } catch { /* cleanup old */ }
  } catch (e) {
    console.warn('[SecureStorage] set failed:', e)
  }
}

export async function secureGet(key) {
  try {
    let raw = await _idbSecureGet(SECURE_PREFIX + key)
    if (!raw) {
      raw = localStorage.getItem(SECURE_PREFIX + key)
      if (raw) {
        await _idbSecureSet(SECURE_PREFIX + key, raw)
        try { localStorage.removeItem(SECURE_PREFIX + key) } catch { /* cleanup */ }
      }
    }
    if (!raw) return null
    if (raw.startsWith('E:')) {
      const decrypted = await aesDecrypt(raw.slice(2))
      return decrypted ? JSON.parse(decrypted) : null
    }
    if (raw.startsWith('B:')) {
      return b64Decode(raw.slice(2))
    }
    return b64Decode(raw)
  } catch {
    return null
  }
}

export async function secureRemove(key) {
  try {
    await _idbSecureRemove(SECURE_PREFIX + key)
    localStorage.removeItem(SECURE_PREFIX + key)
  } catch { /* ignore */ }
}

export async function secureClearAll() {
  try {
    const db = await _openSecureDB()
    const tx = db.transaction('data', 'readwrite')
    tx.objectStore('data').clear()
    await new Promise((resolve) => { tx.oncomplete = resolve })
  } catch { /* ignore */ }
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(SECURE_PREFIX)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch { /* ignore */ }
}

export async function secureSetSession(session) {
  if (!session) return
  await secureSet('session', {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user?.id,
  })
}

export async function secureGetSession() {
  return secureGet('session')
}

export async function secureClearSession() {
  await secureRemove('session')
}
