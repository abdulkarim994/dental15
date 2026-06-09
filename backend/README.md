# المرحلة 3 — الأمان والتكلفة (كود خلفي مرجعي)

هذه الملفات **خارج حزمة التطبيق** ولا تؤثر على بنائه أو ميزاته. تُنشر مرة واحدة.

## 1) Cloudflare R2 Worker المؤمَّن — `r2-worker/`
يمنع أي مستخدم مُصدَّق من قراءة/حذف صور غيره عبر التحقق أن `sub` في توكن
Supabase يساوي `{uid}` في مسار المفتاح `xray/{uid}/...`.

النشر:
```
cd backend/r2-worker
wrangler r2 bucket create thelu-xrays          # مرة واحدة
wrangler secret put SUPABASE_JWT_SECRET        # من Supabase → Settings → API → JWT Secret
wrangler deploy
```
ثم اجعل `VITE_R2_WORKER` في تطبيقك يشير لرابط هذا الـ Worker (نفس المسارات الحالية — لا تغيير في العميل).

ملاحظة تكلفة: R2 بلا رسوم Egress، فالتكلفة تخزين + عمليات فقط — مناسب لـ 100–500 ألف مستخدم.

## 2) Supabase RLS — `supabase/rls-user-data.sql`
يفعّل Row Level Security على `user_data` بحيث يرى كل مستخدم صفّه فقط
(`user_id = auth.uid()`). شغّله في Supabase → SQL Editor.

> عدّل اسم عمود المالك في SQL إن لم يكن `user_id`.

## ترتيب الطرح الآمن
1. شغّل RLS (لا يكسر العميل المسجَّل دخوله).
2. انشر الـ Worker المؤمَّن ثم وجّه `VITE_R2_WORKER` إليه.
3. ابنِ التطبيق (المرحلتان 1 و2 مطبّقتان داخل `src/`).
