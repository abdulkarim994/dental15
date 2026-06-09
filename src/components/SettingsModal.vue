<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-ol" style="display:flex;align-items:flex-start;justify-content:center;overflow-y:auto" @click.self="$emit('close')">
      <div class="max-w-lg mx-auto px-4 pb-20 space-y-4 w-full" @click.stop>
        <div class="settings-header flex justify-between items-center py-4 sticky top-0 z-10 backdrop-blur-xl border-b border-white/5 mb-2" style="background:rgba(4,9,24,.97)">
          <h2 class="font-black text-base" style="color:var(--gold)">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            الإعدادات
          </h2>
          <button @click="$emit('close')" class="glass-sm w-11 h-11 flex items-center justify-center text-sm">✕</button>
        </div>

        <!-- ═══ GROUP 1: معلومات المركز ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('center')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1"/><path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg> معلومات المركز</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('center') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('center') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <span class="sec-h">اسم المركز</span>
                <div class="flex gap-2"><input type="text" v-model="localCfg.centerName" class="inp flex-1 text-sm" placeholder="طب الأسنان الرقمي"><button @click="saveSetting('centerName')" class="btn-g px-4 py-2 text-xs">حفظ</button></div>
              </div>
              <!-- Logo upload -->
              <div class="glass p-4 space-y-3">
                <span class="sec-h">شعار طباعة التقرير</span>
                <div v-if="logoPreview" class="flex items-center gap-2 p-2 rounded-xl" style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15)">
                  <img :src="logoPreview" style="max-height:44px;max-width:90px;object-fit:contain;border-radius:6px" alt="شعار">
                  <button @click="removeLogo" class="text-[10px] px-2 py-1 rounded-lg" style="background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.25)">✕ حذف</button>
                </div>
                <label class="flex items-center gap-2 cursor-pointer btn-g px-3 py-2 text-xs w-full justify-center rounded-xl" style="font-family:inherit">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  رفع صورة من الجهاز
                  <input type="file" accept="image/*" class="hidden" @change="uploadLogo">
                </label>
                <p class="text-[9px] opacity-35">PNG/JPG/SVG — يظهر في أعلى صفحة الطباعة</p>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">عملة الدفع</span>
                <div class="flex gap-2"><input type="text" v-model="localCfg.currency" class="inp flex-1 text-sm" placeholder="د.ل"><button @click="saveSetting('currency')" class="btn-g px-4 py-2 text-xs">حفظ</button></div>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">نسبة الطبيب في التركيبات</span>
                <div class="flex gap-2 items-center"><input type="number" v-model.number="localCfg.doctorPct" class="inp flex-1 text-sm" min="0" max="100"><span class="opacity-50">%</span><button @click="saveSetting('doctorPct')" class="btn-g px-4 py-2 text-xs">حفظ</button></div>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">نسبة الطبيب في المعالجات العادية</span>
                <div class="flex gap-2 items-center"><input type="number" v-model.number="localCfg.doctorPctRegular" class="inp flex-1 text-sm" min="0" max="100"><span class="opacity-50">%</span><button @click="saveSetting('doctorPctRegular')" class="btn-g px-4 py-2 text-xs">حفظ</button></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 2: العيادات والمعالجات ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('clinic')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.5 2 7 4.5 7 7c0 3 1.5 6 2 9 .3 2 .7 4 1 5h4c.3-1 .7-3 1-5 .5-3 2-6 2-9 0-2.5-1.5-5-5-5z"/></svg> العيادات والمعالجات</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('clinic') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('clinic') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <span class="sec-h">العيادات</span>
                <div class="space-y-1">
                  <div v-for="(cli, i) in localCfg.clinics" :key="i" class="flex items-center justify-between gap-2 p-2 rounded-lg" style="background:rgba(255,255,255,.04)">
                    <template v-if="editingClinicIdx === i">
                      <input type="text" v-model="editingClinicName" class="inp flex-1 text-xs" style="padding:6px 10px" @keyup.enter="confirmRenameClinic(i)" ref="renameInput">
                      <div class="flex gap-1">
                        <button @click="confirmRenameClinic(i)" class="text-xs px-2 py-1 rounded-lg" style="background:rgba(59,130,246,.15);color:var(--gold);border:1px solid rgba(59,130,246,.3);cursor:pointer;font-family:inherit;transition:all .2s">حفظ</button>
                        <button @click="cancelRenameClinic" class="text-xs px-2 py-1 rounded-lg" style="background:rgba(255,255,255,.05);color:rgba(221,228,240,.5);border:1px solid rgba(255,255,255,.1);cursor:pointer;font-family:inherit;transition:all .2s">إلغاء</button>
                      </div>
                    </template>
                    <template v-else>
                      <span class="text-xs">{{ cli }}</span>
                      <div class="flex gap-1">
                        <button @click="startRenameClinic(i)" class="text-xs px-2" style="color:var(--gold-l);opacity:.6;cursor:pointer;background:none;border:none;padding:4px;transition:opacity .2s" title="إعادة تسمية">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button @click="removeItem('clinics', i)" class="text-red-400 text-xs px-2">✕</button>
                      </div>
                    </template>
                  </div>
                </div>
                <div class="flex gap-2 mt-2"><input type="text" v-model="newClinic" class="inp flex-1 text-sm" placeholder="اسم عيادة جديدة"><button @click="addItem('clinics', newClinic); newClinic = ''" class="btn-g px-3 py-2 text-xs">+ إضافة</button></div>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">المعالجات</span>
                <div class="space-y-1">
                  <div v-for="(svc, i) in localCfg.services" :key="i" class="flex items-center justify-between gap-2 p-2 rounded-lg" style="background:rgba(255,255,255,.04)">
                    <span class="text-xs">{{ svc }}</span>
                    <div class="flex items-center gap-1">
                      <input type="number" :value="localCfg.servicePrices?.[svc] || ''" @change="setSvcPrice(svc, $event.target.value)" class="inp text-xs" style="width:70px;padding:3px 6px" placeholder="السعر" min="0">
                      <button @click="removeItem('services', i)" class="text-red-400 text-xs px-2">✕</button>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 mt-2"><input type="text" v-model="newService" class="inp flex-1 text-sm" placeholder="اسم معالجة جديدة"><button @click="addItem('services', newService); newService = ''" class="btn-g px-3 py-2 text-xs">+ إضافة</button></div>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">طرق الدفع</span>
                <div class="space-y-1">
                  <div v-for="(pay, i) in localCfg.payments" :key="i" class="flex items-center justify-between gap-2 p-2 rounded-lg" style="background:rgba(255,255,255,.04)">
                    <span class="text-xs">{{ pay }}</span>
                    <button @click="removeItem('payments', i)" class="text-red-400 text-xs px-2">✕</button>
                  </div>
                </div>
                <div class="flex gap-2 mt-2"><input type="text" v-model="newPayment" class="inp flex-1 text-sm" placeholder="طريقة دفع جديدة"><button @click="addItem('payments', newPayment); newPayment = ''" class="btn-g px-3 py-2 text-xs">+ إضافة</button></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 2.5: نظام الحجز ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('booking')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-6"/><path d="M12 8V2"/><rect x="4" y="8" width="16" height="8" rx="2"/></svg> نظام الحجز</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('booking') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('booking') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <!-- Booking type -->
              <div class="glass p-4 space-y-3">
                <span class="sec-h">نوع نظام الحجز</span>
                <div class="flex gap-2">
                  <button
                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                    :class="localCfg.bookingType !== 'queue' ? 'btn-g' : 'btn-o'"
                    @click="localCfg.bookingType = 'traditional'; saveSetting('bookingType')"
                  >النظام التقليدي</button>
                  <button
                    class="flex-1 py-2.5 text-xs font-bold rounded-xl transition-all"
                    :class="localCfg.bookingType === 'queue' ? 'btn-g' : 'btn-o'"
                    @click="localCfg.bookingType = 'queue'; saveSetting('bookingType')"
                  >نظام الدور</button>
                </div>
                <p class="text-[9px] opacity-35">يمكن التبديل بينهما في أي وقت دون فقدان أي بيانات</p>
              </div>
              <!-- Record retention -->
              <div class="glass p-4 space-y-3">
                <span class="sec-h">حذف السجلات القديمة تلقائياً</span>
                <div class="flex items-center justify-between mb-2">
                  <p class="text-[10px] opacity-50">تفعيل الحذف التلقائي</p>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.retentionEnabled" @change="saveRetention"><span class="tgl-s"></span></label>
                </div>
                <div v-if="localCfg.retentionEnabled" class="space-y-3">
                  <div>
                    <p class="text-[10px] opacity-50 mb-1">عدد الأيام</p>
                    <select v-model.number="localCfg.retentionDays" class="inp text-xs w-full" @change="saveRetention">
                      <option :value="3">3 أيام (افتراضي)</option>
                      <option :value="7">7 أيام</option>
                      <option :value="14">14 يوم</option>
                      <option :value="30">30 يوم</option>
                      <option :value="0">عدم الحذف</option>
                    </select>
                  </div>
                  <div>
                    <p class="text-[10px] opacity-50 mb-1">نطاق الحذف</p>
                    <div class="space-y-2">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" :value="false" v-model="localCfg.retentionDeleteCloud" @change="saveRetention" class="accent-blue-500">
                        <div><span class="text-[11px]">الحذف من الهاتف فقط</span><p class="text-[9px] opacity-35">تبقى السجلات في Supabase</p></div>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" :value="true" v-model="localCfg.retentionDeleteCloud" @change="saveRetention" class="accent-blue-500">
                        <div><span class="text-[11px]">الحذف من الهاتف والسحابة</span><p class="text-[9px] opacity-35">حذف من الجهاز ومن Supabase معاً</p></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Default interval -->
              <div class="glass p-4 space-y-3">
                <span class="sec-h">الفاصل الزمني بين المرضى (دقائق)</span>
                <div class="flex gap-2">
                  <input type="number" v-model.number="localCfg.queueInterval" class="inp flex-1 text-sm" min="5" max="60" placeholder="15">
                  <button @click="saveSetting('queueInterval')" class="btn-g px-4 py-2 text-xs">حفظ</button>
                </div>
                <p class="text-[9px] opacity-35">يستخدم لحساب الوقت المتوقع تلقائياً (الافتراضي: 15 دقيقة)</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 3: الحماية والتأكيدات ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('protect')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> الحماية والتأكيدات</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('protect') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('protect') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-2">
                <span class="sec-h">تأكيد مزدوج قبل الحذف</span>
                <p class="text-[9px] opacity-40">تحكم في عرض نافذة التأكيد مع العداد لكل نوع سجل</p>
                <div v-for="dc in dcItems" :key="dc.key" class="dc-set-row">
                  <div class="dc-set-info">
                    <div class="dc-set-label">{{ dc.label }}</div>
                    <div class="dc-set-sub">{{ dc.sub }}</div>
                  </div>
                  <div class="dc-set-dur">
                    <input type="number" v-model.number="localCfg.dcConfirm[dc.key + 'Dur']" class="inp" min="0" max="30" @change="saveDcSettings">
                    <span>ثانية</span>
                  </div>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.dcConfirm[dc.key + 'On']" @change="saveDcSettings"><span class="tgl-s"></span></label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 4: الإشعارات ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('notif')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> الإشعارات</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('notif') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('notif') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div><p class="text-xs font-bold">تذكير المواعيد القادمة</p><p class="text-[10px] opacity-40">إشعار عند فتح التطبيق بمواعيد اليوم والغد</p></div>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.apptNotif" @change="saveNotifSettings"><span class="tgl-s"></span></label>
                </div>
              </div>
              <div class="glass p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div><p class="text-xs font-bold">العودة التلقائية لتبويب الإضافة</p><p class="text-[10px] opacity-40">بعد حفظ موعد المتابعة</p></div>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.followUpAuto" @change="saveNotifSettings"><span class="tgl-s"></span></label>
                </div>
              </div>
              <div class="glass p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div><p class="text-xs font-bold">حفظ حالة التبويب</p><p class="text-[10px] opacity-40">عند الخروج من السجلات أو المالية يحفظ مكانك</p></div>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.keepTabState" @change="saveSetting('keepTabState')"><span class="tgl-s"></span></label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 5: المظهر والعرض ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('theme')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> المظهر والعرض</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('theme') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('theme') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <span class="sec-h">حجم الخط</span>
                <div class="grid grid-cols-4 gap-2">
                  <button v-for="fs in fontSizes" :key="fs.key" @click="setFontSize(fs.key)" class="btn-o py-2.5 text-xs font-bold" :class="{ 'qs-on': currentFontSize === fs.key }">{{ fs.label }}</button>
                </div>
              </div>
              <div class="glass p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div><p class="text-xs font-bold">الوضع الفاتح</p><p class="text-[10px] opacity-40">Light Mode</p></div>
                  <label class="tgl"><input type="checkbox" v-model="isLight" @change="toggleTheme"><span class="tgl-s"></span></label>
                </div>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">الزر العائم (+)</span>
                <p class="text-[9px] opacity-40">تحكم بموقع زر الإضافة السريع أو إخفائه</p>
                <div class="flex items-center justify-between">
                  <span class="text-xs opacity-60">إظهار الزر العائم</span>
                  <label class="tgl"><input type="checkbox" v-model="localCfg.fabVisible" @change="saveFabSettings"><span class="tgl-s"></span></label>
                </div>
                <div v-if="localCfg.fabVisible" class="flex items-center gap-2">
                  <span class="text-[10px] opacity-50 whitespace-nowrap">الموقع:</span>
                  <div class="grid grid-cols-3 gap-2 flex-1">
                    <button @click="localCfg.fabPosition = 'right'; saveFabSettings()" class="btn-o py-2 text-[10px] font-bold" :class="{ 'qs-on': localCfg.fabPosition === 'right' }">يمين</button>
                    <button @click="localCfg.fabPosition = 'center'; saveFabSettings()" class="btn-o py-2 text-[10px] font-bold" :class="{ 'qs-on': localCfg.fabPosition === 'center' }">وسط</button>
                    <button @click="localCfg.fabPosition = 'left'; saveFabSettings()" class="btn-o py-2 text-[10px] font-bold" :class="{ 'qs-on': localCfg.fabPosition === 'left' }">يسار</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 6: التخزين والنسخ الاحتياطي ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('storage')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg> التخزين والنسخ الاحتياطي</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('storage') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('storage') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <span class="sec-h">المزامنة</span>
                <div class="flex items-center justify-between"><span class="text-xs opacity-60">مزامنة تلقائية</span><label class="tgl"><input type="checkbox" v-model="localCfg.autoSync" @change="saveSetting('autoSync')"><span class="tgl-s"></span></label></div>
                <div class="flex gap-2 items-center"><span class="text-xs opacity-50 whitespace-nowrap">كل:</span><input type="number" v-model.number="localCfg.syncMin" class="inp flex-1 text-sm" min="5" placeholder="30"><span class="text-xs opacity-40">دقيقة</span><button @click="saveSetting('syncMin')" class="btn-g px-3 py-2 text-xs">حفظ</button></div>
                <button @click="manualSync" class="btn-o w-full py-2 text-xs flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
                  مزامنة الآن
                </button>
              </div>
              <div class="glass p-4 space-y-3">
                <span class="sec-h">النسخ الاحتياطي</span>
                <button @click="exportExcel" class="btn-o w-full py-2 text-xs flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                  تصدير Excel
                </button>
                <button @click="exportJSON" class="btn-o w-full py-2 text-xs flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>
                  نسخة محلية JSON
                </button>
                <label class="btn-o w-full py-2 text-xs text-center cursor-pointer flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><polyline points="12 11 12 17"/><polyline points="9 14 12 11 15 14"/></svg>
                  استعادة JSON
                  <input type="file" accept=".json" class="hidden" @change="importJSON">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 7: قوالب رسائل واتساب ═══ -->
        <div class="set-group">
          <div class="set-group-head" @click="toggle('wa')">
            <div class="sg-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#25d366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> قوالب رسائل واتساب</div>
            <span class="sg-arr" :class="{ 'sg-open': openGroups.has('wa') }">▼</span>
          </div>
          <div class="set-group-body" :class="openGroups.has('wa') ? 'sg-show' : ''">
            <div class="set-group-body-inner">
              <div class="glass p-4 space-y-3">
                <p class="text-[9px] opacity-40">استخدم {name} لاسم المريض و {center} لاسم العيادة</p>
                <div class="space-y-3">
                  <div v-for="(tpl, i) in localWaTpls" :key="i" class="glass-sm p-3 space-y-2 rounded-xl">
                    <input type="text" v-model="tpl.lbl" class="inp text-xs font-bold" placeholder="اسم القالب">
                    <textarea v-model="tpl.msg" class="inp text-xs h-20 resize-none" placeholder="نص الرسالة..."></textarea>
                    <button @click="removeWaTpl(i)" class="text-red-400 text-[10px] px-2 py-0.5 rounded-lg" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2)">✕ حذف القالب</button>
                  </div>
                </div>
                <button @click="addWaTpl" class="btn-o w-full py-2 text-xs">+ إضافة قالب جديد</button>
                <button @click="saveWaTpls" class="btn-g w-full py-2.5 text-xs flex items-center justify-center gap-1.5">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  حفظ القوالب
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ تسجيل الخروج ═══ -->
        <div class="glass p-4">
          <button @click="showLogoutDialog = true" class="w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2" style="background:rgba(255,68,85,.1);border:1px solid rgba(255,68,85,.25);color:#ff4455">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            تسجيل الخروج
          </button>
        </div>

        <LogoutDialog
          :visible="showLogoutDialog"
          :pending-count="pendingUploadCount"
          @confirm="handleLogoutConfirm"
          @upload="handleLogoutUpload"
          @delete="handleLogoutDelete"
          @cancel="showLogoutDialog = false"
        />

        <!-- ═══ الدعم الفني ═══ -->
        <div class="glass p-4 space-y-2 text-center">
          <p class="text-[10px] opacity-35 mb-2">الدعم الفني</p>
          <a href="https://wa.me/218919292258" target="_blank" rel="noopener"
             class="flex items-center justify-center gap-2.5 w-full py-3 text-sm font-bold rounded-xl"
             style="background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.28);color:#25d366;text-decoration:none">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.523 5.845L.057 23.492a.5.5 0 00.613.593l5.797-1.522A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.504-5.23-1.385l-.374-.217-3.881 1.018 1.035-3.783-.233-.378A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            تواصل مع المطور — 0919292258
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useSyncStore } from '@/stores/sync.store'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import { pendingUploadCount, stopUploadQueueListener, uploadAllPending, removeAllPending } from '@/services/image.service'
import LogoutDialog from '@/components/LogoutDialog.vue'
// xlsx loaded dynamically in exportExcel()

defineProps({ visible: { type: Boolean, default: false } })
defineEmits(['close'])

const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const syncSt = useSyncStore()
const { toast } = useToast()
const { toggleTheme: doToggleTheme } = useTheme()

const openGroups = ref(new Set(['center']))
const newClinic = ref('')
const newService = ref('')
const newPayment = ref('')
const editingClinicIdx = ref(-1)
const editingClinicName = ref('')
const showLogoutDialog = ref(false)
const renameInput = ref(null)

const dcItems = [
  { key: 'rec', label: 'السجلات', sub: 'سجلات العلاج والتركيبات' },
  { key: 'debt', label: 'الديون', sub: 'سجلات الديون والدفعات' },
  { key: 'pat', label: 'المرضى', sub: 'حذف بيانات مريض بالكامل' },
  { key: 'appt', label: 'المواعيد', sub: 'حذف مواعيد المرضى' },
]

const fontSizes = [
  { key: 'fs-small', label: 'صغير' },
  { key: 'fs-medium', label: 'عادي' },
  { key: 'fs-large', label: 'كبير' },
  { key: 'fs-xlarge', label: 'أكبر' },
]
const currentFontSize = ref(localStorage.getItem('dental_font_size') || 'fs-medium')
const isLight = ref(document.body.classList.contains('light'))
const logoPreview = ref('')
const localWaTpls = ref([])

const localCfg = reactive({
  centerName: '',
  currency: '',
  doctorPct: 50,
  doctorPctRegular: 50,
  clinics: [],
  services: [],
  payments: [],
  servicePrices: {},
  autoSync: true,
  syncMin: 30,
  apptNotif: true,
  followUpAuto: false,
  dcConfirm: { recOn: true, recDur: 3, debtOn: true, debtDur: 3, patOn: true, patDur: 3, apptOn: true, apptDur: 3 },
  keepTabState: false,
  fabPosition: 'center',
  fabVisible: true,
  bookingType: 'traditional',
  retentionEnabled: false,
  retentionDays: 3,
  retentionDeleteCloud: false,
  queueInterval: 15,
})

watch(() => app.config, (cfg) => {
  localCfg.centerName = cfg.centerName || ''
  localCfg.currency = cfg.currency || 'د.ل'
  localCfg.doctorPct = cfg.doctorPct || 50
  localCfg.doctorPctRegular = cfg.doctorPctRegular || 50
  localCfg.clinics = [...(cfg.clinics || [])]
  localCfg.services = [...(cfg.services || [])]
  localCfg.payments = [...(cfg.payments || [])]
  localCfg.servicePrices = { ...(cfg.servicePrices || {}) }
  localCfg.autoSync = cfg.autoSync !== false
  localCfg.syncMin = cfg.syncMin || 30
  localCfg.apptNotif = cfg.apptNotif !== false
  localCfg.followUpAuto = cfg.followUpAuto === true
  localCfg.dcConfirm = {
    recOn: cfg.dcConfirm?.recOn !== false, recDur: cfg.dcConfirm?.recDur ?? 3,
    debtOn: cfg.dcConfirm?.debtOn !== false, debtDur: cfg.dcConfirm?.debtDur ?? 3,
    patOn: cfg.dcConfirm?.patOn !== false, patDur: cfg.dcConfirm?.patDur ?? 3,
    apptOn: cfg.dcConfirm?.apptOn !== false, apptDur: cfg.dcConfirm?.apptDur ?? 3,
  }
  localCfg.keepTabState = cfg.keepTabState === true
  localCfg.fabPosition = cfg.fabPosition || 'center'
  localCfg.fabVisible = cfg.fabVisible !== false
  localCfg.bookingType = cfg.bookingType || 'traditional'
  localCfg.retentionEnabled = cfg.retentionEnabled === true
  localCfg.retentionDays = cfg.retentionDays ?? 3
  localCfg.retentionDeleteCloud = cfg.retentionDeleteCloud === true
  localCfg.queueInterval = cfg.queueInterval || 15
  logoPreview.value = cfg.logo || ''
  localWaTpls.value = (cfg.waTemplates || []).map(t => ({ ...t }))
}, { immediate: true, deep: true })

function toggle(key) {
  if (openGroups.value.has(key)) openGroups.value.delete(key)
  else openGroups.value.add(key)
  openGroups.value = new Set(openGroups.value)
}

function saveAndSync(updates) {
  app.updateConfig(updates)
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم الحفظ')
}

function saveSetting(key) {
  saveAndSync({ [key]: localCfg[key] })
}

function addItem(key, val) {
  if (!val?.trim()) return
  localCfg[key].push(val.trim())
  saveAndSync({ [key]: [...localCfg[key]] })
}

function removeItem(key, idx) {
  localCfg[key].splice(idx, 1)
  saveAndSync({ [key]: [...localCfg[key]] })
}

function setSvcPrice(svc, val) {
  const prices = { ...localCfg.servicePrices }
  if (val && Number(val) > 0) prices[svc] = Number(val)
  else delete prices[svc]
  localCfg.servicePrices = prices
  saveAndSync({ servicePrices: prices })
}

function saveDcSettings() {
  saveAndSync({ dcConfirm: { ...localCfg.dcConfirm } })
}

function saveFabSettings() {
  saveAndSync({ fabPosition: localCfg.fabPosition, fabVisible: localCfg.fabVisible })
}

function saveRetention() {
  saveAndSync({
    retentionEnabled: localCfg.retentionEnabled,
    retentionDays: localCfg.retentionDays,
    retentionDeleteCloud: localCfg.retentionDeleteCloud,
  })
}

function saveNotifSettings() {
  saveAndSync({ apptNotif: localCfg.apptNotif, followUpAuto: localCfg.followUpAuto })
  localStorage.setItem('dental_followup_auto', localCfg.followUpAuto ? '1' : '0')
  localStorage.setItem('dental_appt_notif', localCfg.apptNotif ? '1' : '0')
}

function uploadLogo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    logoPreview.value = ev.target.result
    saveAndSync({ logo: ev.target.result })
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoPreview.value = ''
  saveAndSync({ logo: '' })
}

function addWaTpl() {
  localWaTpls.value.push({ lbl: '', msg: '' })
}

function removeWaTpl(idx) {
  localWaTpls.value.splice(idx, 1)
}

function saveWaTpls() {
  saveAndSync({ waTemplates: localWaTpls.value.filter(t => t.lbl || t.msg) })
}

function setFontSize(key) {
  currentFontSize.value = key
  document.body.classList.remove('fs-small', 'fs-medium', 'fs-large', 'fs-xlarge')
  document.body.classList.add(key)
  localStorage.setItem('dental_font_size', key)
}

function toggleTheme() {
  doToggleTheme()
  isLight.value = document.body.classList.contains('light')
}

async function manualSync() {
  try {
    const ok = await app.syncSave(auth.uid, false)
    await app.syncLoad(auth.uid)
    app.saveToCache(auth.uid)
    if (!ok) toast('⚠ تحقق من الاتصال')
    else toast('تمت المزامنة')
  } catch {
    toast('فشلت المزامنة')
  }
}

async function exportExcel() {
  try {
    const { utils, writeFile } = await import('xlsx')
    const wb = utils.book_new()
    const rData = [['الاسم', 'التاريخ', 'القيمة', 'العيادة', 'الخدمة', 'الدفع'],
      ...app.records.filter(r => !r.isPros).map(r => [r.name, r.date, r.amount || 0, r.clinic, r.service, r.payment])]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(rData), 'السجلات')
    const pData = [['الاسم', 'التاريخ', 'الإجمالي', 'المعمل', 'نسبة الطبيب', 'نسبة العيادة', 'العيادة'],
      ...app.prosthetics.map(p => [p.name, p.date, p.total || 0, p.labValue || 0, p.doctorShare || 0, p.clinicShare || 0, p.clinic])]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(pData), 'التركيبات')
    const dData = [['الاسم', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الهاتف', 'الحالة'],
      ...app.debts.map(d => [d.name, d.date, d.totalAmount || d.total || 0, d.paidAmount || 0, d.remaining || 0, d.phone || '', d.status])]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(dData), 'الديون')
    writeFile(wb, `dental_${app.config.centerName || 'export'}_${new Date().toISOString().substring(0, 10)}.xlsx`)
    toast('تم تصدير Excel')
  } catch (e) {
    console.error('Excel export error:', e)
    toast('خطأ في التصدير')
  }
}

function exportJSON() {
  const data = {
    records: app.records,
    prosthetics: app.prosthetics,
    debts: app.debts,
    appointments: app.appointments,
    config: app.config,
    exportDate: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dental_backup_${new Date().toISOString().substring(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('تم تصدير النسخة الاحتياطية')
}

function importJSON(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!confirm('استعادة النسخة الاحتياطية ستستبدل جميع البيانات الحالية.\n\nمتأكد؟')) return
      if (data.records) app.records = data.records
      if (data.prosthetics) app.prosthetics = data.prosthetics
      if (data.debts) app.debts = data.debts
      if (data.appointments) app.appointments = data.appointments
      if (data.config) app.updateConfig(data.config)
      app.saveToCache(auth.uid)
      app.syncSave(auth.uid, false)
      toast('تمت الاستعادة بنجاح')
    } catch {
      toast('خطأ في قراءة الملف')
    }
  }
  reader.readAsText(file)
}

function startRenameClinic(idx) {
  editingClinicIdx.value = idx
  editingClinicName.value = localCfg.clinics[idx]
  nextTick(() => {
    const inp = renameInput.value
    if (Array.isArray(inp) && inp[0]) inp[0].focus()
    else if (inp) inp.focus()
  })
}

function cancelRenameClinic() {
  editingClinicIdx.value = -1
  editingClinicName.value = ''
}

function confirmRenameClinic(idx) {
  const newName = editingClinicName.value.trim()
  const oldName = localCfg.clinics[idx]
  if (!newName || newName === oldName) {
    cancelRenameClinic()
    return
  }
  if (localCfg.clinics.includes(newName)) {
    toast('هذا الاسم موجود بالفعل')
    return
  }
  localCfg.clinics[idx] = newName
  app.renameClinic(oldName, newName)
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast(`تم تغيير الاسم: ${oldName} → ${newName}`)
  cancelRenameClinic()
}

async function handleLogoutConfirm() {
  showLogoutDialog.value = false
  await _doLogoutSync()
}

async function handleLogoutUpload() {
  showLogoutDialog.value = false
  const count = pendingUploadCount.value
  if (navigator.onLine === false) {
    toast('لا يوجد اتصال بالإنترنت — لا يمكن رفع الصور')
    return
  }
  syncSt.syncing = true
  syncSt.syncMessage = `جار رفع ${count} صور قبل الخروج...`
  syncSt.syncProgress = 10
  try {
    const uploaded = await uploadAllPending()
    syncSt.syncProgress = 60
    if (pendingUploadCount.value > 0) {
      syncSt.syncing = false
      toast(`فشل رفع ${pendingUploadCount.value} صور. حاول مرة أخرى`)
      return
    }
    toast(`تم رفع ${uploaded} صور بنجاح`)
  } catch {
    syncSt.syncing = false
    toast('فشل رفع الصور')
    return
  }
  await _doLogoutSync()
}

async function handleLogoutDelete() {
  showLogoutDialog.value = false
  await removeAllPending()
  await _doLogoutSync()
}

async function _doLogoutSync() {
  if (navigator.onLine === false) {
    toast('فشل تسجيل الخروج: لا يوجد اتصال بالإنترنت. يرجى الاتصال أولاً لمزامنة بياناتك')
    return
  }
  try {
    syncSt.syncing = true
    syncSt.syncMessage = 'جار مزامنة البيانات قبل تسجيل الخروج...'
    syncSt.syncProgress = 70
    const syncOk = await Promise.race([
      app.syncSave(auth.uid, false, true).then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 15000)),
    ])
    if (!syncOk) {
      syncSt.syncing = false
      toast('فشل تسجيل الخروج: انتهت مهلة المزامنة. تأكد من اتصالك بالإنترنت')
      return
    }
    syncSt.syncProgress = 90
    app.saveToCache(auth.uid)
    syncSt.syncProgress = 100
  } catch (e) {
    console.warn('[Logout] Pre-logout sync failed:', e)
    syncSt.syncing = false
    toast('فشل تسجيل الخروج: خطأ في المزامنة. حاول مرة أخرى')
    return
  } finally {
    syncSt.syncing = false
  }
  stopUploadQueueListener()
  await app.clearLocalData(auth.uid)
  await auth.doLogout()
  router.push({ name: 'login' })
}
</script>
