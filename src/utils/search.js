const AR_NORM = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ة': 'ه',
  'ى': 'ي', 'ئ': 'ي',
  'ؤ': 'و',
}

export function normAr(s) {
  if (!s) return ''
  let out = ''
  for (const ch of s) out += AR_NORM[ch] || ch
  return out.replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase()
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i])
  for (let j = 1; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function fuzzyMatch(query, name) {
  if (!query || !name) return !query
  const q = normAr(query)
  const n = normAr(name)
  if (n.includes(q)) return true
  if (q.length <= 2) return n.startsWith(q)
  return levenshtein(q, n) <= Math.max(2, Math.floor(q.length / 3))
}

export function fuzzyScore(query, name) {
  const q = normAr(query)
  const n = normAr(name)
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  return 3 + levenshtein(q, n)
}
