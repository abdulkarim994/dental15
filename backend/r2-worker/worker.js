/**
 * ============================================================================
 *  Cloudflare Worker — مسار رفع/جلب صور R2 المؤمَّن (المرحلة 3 — الأمان)
 * ============================================================================
 *
 *  هذا الملف مرجعي للنشر على Cloudflare Workers، وهو خارج حزمة التطبيق
 *  (لا يُبنى مع Vite ولا يؤثر على أي ميزة في التطبيق).
 *
 *  الهدف: منع أي مستخدم مُصدَّق من قراءة/حذف صور مستخدم آخر بتخمين المفتاح.
 *  القاعدة: مسار الصورة دائمًا  xray/{uid}/...  — لذا نتحقق أن
 *  «sub» داخل توكن Supabase (JWT) يساوي {uid} الموجود في المفتاح.
 *
 *  لا يكسر العميل: نفس المسارات والمفاتيح المستعملة حاليًا في التطبيق
 *  (POST /upload?key=... و GET/DELETE /image/:key)، فقط نضيف تحققًا خادميًا.
 *
 *  متغيرات البيئة المطلوبة (wrangler secret / vars):
 *    - R2_BUCKET           : binding لِـ R2 (في wrangler.toml)
 *    - SUPABASE_JWT_SECRET : "JWT Secret" من إعدادات Supabase (Settings → API)
 *    - ALLOWED_ORIGIN      : أصل التطبيق المسموح به لِـ CORS (اختياري)
 *
 *  ملاحظة: Supabase يوقّع التوكن الافتراضي بخوارزمية HS256، لذا نتحقق
 *  بالمفتاح السري عبر Web Crypto (HMAC-SHA256) دون أي مكتبة خارجية.
 */

const TEXT = new TextEncoder()

function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * يتحقق من توكن Supabase (HS256) ويعيد الحمولة (payload) عند النجاح،
 * أو null عند الفشل/الانتهاء.
 */
async function verifyJwt(token, secret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !sigB64) return null

    const key = await crypto.subtle.importKey(
      'raw',
      TEXT.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, TEXT.encode(`${headerB64}.${payloadB64}`)),
    )
    const provided = b64urlToBytes(sigB64)

    // مقارنة ثابتة الزمن لتجنّب تسريب التوقيت
    if (expected.length !== provided.length) return null
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ provided[i]
    if (diff !== 0) return null

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function getBearer(request) {
  const h = request.headers.get('Authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

/** يستخرج {uid} من مفتاح بالشكل xray/{uid}/... */
function uidFromKey(key) {
  const parts = (key || '').split('/')
  return parts[0] === 'xray' ? parts[1] : null
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Patient-Name,X-File-Name',
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // 1) المصادقة: لا بدّ من توكن صالح
    const token = getBearer(request)
    if (!token) return new Response('Unauthorized', { status: 401, headers: cors })
    const claims = await verifyJwt(token, env.SUPABASE_JWT_SECRET)
    if (!claims || !claims.sub) {
      return new Response('Invalid token', { status: 401, headers: cors })
    }
    const authUid = claims.sub

    // 2) الرفع: POST /upload?key=xray/{uid}/...
    if (request.method === 'POST' && url.pathname === '/upload') {
      let key = url.searchParams.get('key') || ''
      // إن لم يُرسَل مفتاح، نبني واحدًا مملوكًا لهذا المستخدم
      if (!key) key = `xray/${authUid}/${Date.now()}_${crypto.randomUUID()}.jpg`

      // التفويض: يجب أن يكون المفتاح ضمن مساحة هذا المستخدم
      const keyUid = uidFromKey(key)
      if (keyUid !== authUid) {
        return new Response('Forbidden', { status: 403, headers: cors })
      }

      const body = await request.arrayBuffer()
      await env.R2_BUCKET.put(key, body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'image/jpeg' },
        customMetadata: {
          patientName: request.headers.get('X-Patient-Name') || '',
          fileName: request.headers.get('X-File-Name') || '',
          owner: authUid,
        },
      })
      // نعيد نفس المفتاح المُرسَل (لا remap) لإلغاء «رقصة المفتاح» الهشّة
      return Response.json({ key }, { headers: cors })
    }

    // 3) الجلب/الحذف: /image/:key
    if (url.pathname.startsWith('/image/')) {
      const key = decodeURIComponent(url.pathname.slice('/image/'.length))
      const keyUid = uidFromKey(key)
      if (keyUid !== authUid) {
        return new Response('Forbidden', { status: 403, headers: cors })
      }

      if (request.method === 'GET') {
        const obj = await env.R2_BUCKET.get(key)
        if (!obj) return new Response('Not found', { status: 404, headers: cors })
        const headers = new Headers(cors)
        headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg')
        headers.set('Cache-Control', 'private, max-age=31536000, immutable')
        return new Response(obj.body, { headers })
      }

      if (request.method === 'DELETE') {
        await env.R2_BUCKET.delete(key)
        return new Response(null, { status: 204, headers: cors })
      }
    }

    return new Response('Not found', { status: 404, headers: cors })
  },
}
