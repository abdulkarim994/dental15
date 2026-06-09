/**
 * Compress Bridge — Phase 4
 *
 * Provides a promise-based API to compress images via Web Worker.
 * Falls back to main-thread compression if workers are unavailable
 * or OffscreenCanvas is not supported.
 */

import { markWorkerUsed } from '@/services/auto-cleanup.service'

let _worker = null
let _idCounter = 0
const _pending = new Map()

function getWorker() {
  if (_worker) return _worker
  try {
    _worker = new Worker(
      new URL('./image-compress.worker.js', import.meta.url),
      { type: 'module' },
    )
    _worker.onmessage = (e) => {
      const { id, result, error, width, height } = e.data
      const resolver = _pending.get(id)
      if (!resolver) return
      _pending.delete(id)
      if (error) {
        resolver.reject(new Error(error))
      } else {
        resolver.resolve({ buffer: result, width, height })
      }
    }
    _worker.onerror = () => {
      _worker = null
    }
    return _worker
  } catch {
    return null
  }
}

/**
 * Compress a File/Blob using a Web Worker with OffscreenCanvas.
 * Returns a compressed Blob or null if worker is unavailable.
 */
export async function compressInWorker(file, maxDim = 1200, quality = 0.8) {
  const worker = getWorker()
  if (!worker) return null

  markWorkerUsed()
  const buffer = await file.arrayBuffer()
  const id = ++_idCounter

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      _pending.delete(id)
      reject(new Error('worker-timeout'))
    }, 30000)

    _pending.set(id, {
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(new Blob([result.buffer], { type: 'image/jpeg' }))
      },
      reject: (err) => {
        clearTimeout(timeout)
        if (err.message === 'no-offscreen-canvas') {
          resolve(null)
        } else {
          reject(err)
        }
      },
    })

    worker.postMessage(
      { id, imageData: buffer, maxDim, quality },
      [buffer],
    )
  })
}

export function terminateWorker() {
  if (_worker) {
    _worker.terminate()
    _worker = null
  }
  _pending.clear()
}
