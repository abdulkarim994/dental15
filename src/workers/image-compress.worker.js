/**
 * Image Compression Web Worker — Phase 4
 *
 * Offloads image compression from the main thread to prevent UI jank
 * during xray uploads. Uses OffscreenCanvas when available, otherwise
 * falls back to main-thread compression.
 */

self.onmessage = async function (e) {
  const { id, imageData, width, height, quality, maxDim } = e.data

  try {
    if (typeof OffscreenCanvas === 'undefined') {
      self.postMessage({ id, error: 'no-offscreen-canvas' })
      return
    }

    const bitmap = await createImageBitmap(new Blob([imageData]))
    let w = bitmap.width
    let h = bitmap.height

    if (maxDim && (w > maxDim || h > maxDim)) {
      const ratio = Math.min(maxDim / w, maxDim / h)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)
    }

    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality || 0.8,
    })

    const buffer = await blob.arrayBuffer()
    self.postMessage({ id, result: buffer, width: w, height: h }, [buffer])
  } catch (err) {
    self.postMessage({ id, error: err.message || 'compression-failed' })
  }
}
