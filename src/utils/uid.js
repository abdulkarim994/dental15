let _counter = 0

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  _counter = (_counter + 1) % 0xFFFF
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  const cnt = _counter.toString(36).padStart(4, '0')
  return `${ts}-${rand}-${cnt}`
}
