-- ============================================================================
--  Supabase RLS — تأمين جدول user_data لكل مستخدم (المرحلة 3 — الأمان)
-- ============================================================================
--
--  التطبيق يستعمل مفتاح anon العام (VITE_SUPABASE_KEY) المضمَّن في الـ APK.
--  بدون RLS، أي شخص يملك هذا المفتاح يقرأ/يعدّل بيانات كل المستخدمين.
--  هذه السياسات تقصر كل صف على صاحبه فقط: user_id = auth.uid().
--
--  شغّل هذا مرة واحدة في: Supabase Dashboard → SQL Editor.
--  غير كاسر للتطبيق: العميل مسجَّل دخوله أصلًا، فستمر استعلاماته بنجاح،
--  بينما تُحجب محاولات الوصول لبيانات الآخرين.
--
--  ملاحظة: عدّل اسم عمود المالك إن كان مختلفًا (مثلاً "uid" بدل "user_id").

-- 1) تفعيل RLS على الجدول
alter table public.user_data enable row level security;

-- 2) حذف أي سياسات قديمة بنفس الأسماء (لتشغيل آمن متكرّر)
drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

-- 3) القراءة: المستخدم يرى صفّه فقط
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

-- 4) الإدراج: لا يُدرج صفًّا إلا باسمه
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

-- 5) التحديث: يحدّث صفّه فقط
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6) الحذف: يحذف صفّه فقط
create policy "user_data_delete_own"
  on public.user_data for delete
  using (auth.uid() = user_id);
