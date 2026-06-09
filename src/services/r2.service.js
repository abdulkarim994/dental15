import { getSbToken } from './supabase.service'
import { supabase } from './supabase.service'

const R2_WORKER = import.meta.env.VITE_R2_WORKER

async function refreshToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || getSbToken()
  } catch {
    return getSbToken()
  }
}

export function r2Url(key) {
  if (!R2_WORKER) return ''
  return `${R2_WORKER}/image/${encodeURIComponent(key)}`
}

export function r2AuthHeaders() {
  return { 'Authorization': `Bearer ${getSbToken()}` }
}

/**
 * Fetch an image using Authorization header (more secure than URL token).
 * Returns a blob URL suitable for <img src>. Falls back to direct URL.
 */
export async function fetchImageSecure(key) {
  if (!R2_WORKER) {
    console.warn('[R2] VITE_R2_WORKER not configured')
    return null
  }
  try {
    const token = await refreshToken()
    if (!token) {
      console.warn('[R2] No auth token for image:', key)
      return null
    }
    const url = `${R2_WORKER}/image/${encodeURIComponent(key)}`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn('[R2] Fetch failed:', res.status, 'key:', key)
      return null
    }
    const blob = await res.blob()
    if (!blob || !blob.size) {
      console.warn('[R2] Empty blob for:', key)
      return null
    }
    return URL.createObjectURL(blob)
  } catch (e) {
    console.warn('[R2] fetchImageSecure error:', e.message, 'key:', key)
    return null
  }
}

/**
 * Fetch an image from R2 and return the raw Blob (not a blob: URL).
 * Callers that need to persist the bytes (thumbnail generation, IndexedDB
 * caching) should use this instead of fetchImageSecure + fetch(blobUrl): the
 * round-trip through a blob: URL is wasteful and is blocked by the CSP
 * connect-src policy, which silently broke offline persistence.
 */
export async function fetchImageBlob(key) {
  if (!R2_WORKER) {
    console.warn('[R2] VITE_R2_WORKER not configured')
    return null
  }
  try {
    const token = await refreshToken()
    if (!token) {
      console.warn('[R2] No auth token for image:', key)
      return null
    }
    const url = `${R2_WORKER}/image/${encodeURIComponent(key)}`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn('[R2] Fetch failed:', res.status, 'key:', key)
      return null
    }
    const blob = await res.blob()
    if (!blob || !blob.size) {
      console.warn('[R2] Empty blob for:', key)
      return null
    }
    return blob
  } catch (e) {
    console.warn('[R2] fetchImageBlob error:', e.message, 'key:', key)
    return null
  }
}

const UPLOAD_TIMEOUT = 120000
const UPLOAD_MAX_RETRIES = 2

export async function uploadImage(file, key, patientName, fileName) {
  let lastError = null
  for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT)

    try {
      const token = await refreshToken()
      const params = new URLSearchParams({ key: key || '' })
      const res = await fetch(`${R2_WORKER}/upload?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'image/jpeg',
          'X-Patient-Name': encodeURIComponent(patientName || ''),
          'X-File-Name': encodeURIComponent(fileName || ''),
        },
        body: file,
        signal: controller.signal,
      })

      clearTimeout(timer)
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      return await res.json()
    } catch (e) {
      clearTimeout(timer)
      lastError = e
      if (attempt < UPLOAD_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

export async function deleteImage(key) {
  const token = await refreshToken()
  const res = await fetch(`${R2_WORKER}/image/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      if (height > maxWidth) {
        width = Math.round((width * maxWidth) / height)
        height = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

export function createThumbnail(file, size = 150) {
  return compressImage(file, size, 0.6)
}
