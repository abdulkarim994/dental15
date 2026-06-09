<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-1">
      <button @click="goBack" class="btn-o px-3 py-1.5 text-xs">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:scaleX(-1)"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-black truncate" style="color:var(--gold-l)">{{ patientName }}</h2>
        <p class="text-[9px] opacity-35">{{ clinicName }}</p>
      </div>
      <button class="btn-o px-2.5 py-1.5 text-[10px]" title="المزيد" @click="showActions = true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    </div>

    <!-- Patient Summary Card -->
    <div class="glass p-4 rounded-2xl">
      <!-- Financial summary — same layout for all patients -->
      <div class="grid grid-cols-2 gap-3">
        <div class="pp-stat-box" style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.12)">
          <div class="flex items-center justify-between">
            <span class="text-[9px] opacity-45">زيارات</span>
            <span class="text-sm font-black" style="color:var(--gold)">{{ patient.visitCount || 0 }}</span>
          </div>
        </div>
        <div class="pp-stat-box" style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.12)">
          <div class="flex items-center justify-between">
            <span class="text-[9px] opacity-45">الإجمالي</span>
            <span class="text-sm font-black" style="color:var(--gold-l)"><span class="n">{{ n(patient.grossTotal || 0) }}</span> <span class="text-[8px] opacity-40">{{ cur }}</span></span>
          </div>
        </div>
        <div class="pp-stat-box" style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.12)">
          <div class="flex items-center justify-between">
            <span class="text-[9px] opacity-45">المدفوع</span>
            <span class="text-sm font-black text-green-400"><span class="n">{{ n(patient.total || 0) }}</span> <span class="text-[8px] opacity-40">{{ cur }}</span></span>
          </div>
        </div>
        <div class="pp-stat-box" :style="patient.debtRemaining > 0 ? 'background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);cursor:pointer' : 'background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.12)'" @click="patient.debtRemaining > 0 && (activeSection = 'debts')">
          <div class="flex items-center justify-between">
            <span class="text-[9px] opacity-45">{{ patient.debtRemaining > 0 ? 'المتبقي' : 'الديون' }}</span>
            <span class="text-sm font-black" :style="{ color: patient.debtRemaining > 0 ? 'var(--red)' : 'var(--green)' }">
              <span v-if="patient.debtRemaining > 0" class="n">{{ n(patient.debtRemaining) }} <span class="text-[8px] opacity-40">{{ cur }}</span></span>
              <span v-else>&#10003; لا ديون</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Treatment Cards (dynamic per service type) -->
      <div v-if="treatmentCards.length" class="mt-3 pt-3 border-t border-white/6">
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="card in treatmentCards" :key="card.service"
            class="tc-card" :style="card.style"
            @click="openTreatmentDetail(card)">
            <span class="tc-label">{{ card.service }}</span>
            <span class="tc-amount n">{{ n(card.paidTotal) }}</span>
          </div>
        </div>
      </div>

      <!-- Treatment plan status -->
      <div v-if="treatmentPlan.length" class="mt-2 text-[9px]" style="color:var(--green)">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        خطة علاج: {{ tpDone }}/{{ treatmentPlan.length }} مرحلة
      </div>
    </div>

    <!-- Section Tabs -->
    <div class="rec-filter-bar">
      <button class="rec-filter-btn" :class="{ 'rf-on': activeSection === 'visits' }" @click="activeSection = 'visits'">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        الزيارات
      </button>
      <button class="rec-filter-btn" :class="{ 'rf-on': activeSection === 'debts' }" @click="activeSection = 'debts'">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>
        الديون
        <span v-if="patientDebts.length" class="text-[8px] mr-0.5" style="color:var(--red)">({{ patientDebts.length }})</span>
      </button>
      <button class="rec-filter-btn" :class="{ 'rf-on': activeSection === 'xrays' }" @click="activeSection = 'xrays'">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
        الأشعة
      </button>
      <button class="rec-filter-btn" :class="{ 'rf-on': activeSection === 'plan' }" @click="activeSection = 'plan'">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        خطة العلاج
      </button>
    </div>

    <!-- Visits Section -->
    <div v-if="activeSection === 'visits'" class="space-y-1.5">
      <div v-if="!patientRecords.length" class="text-center py-10 opacity-25">
        <p class="text-xs">لا توجد زيارات مسجلة</p>
      </div>
      <RecordRow
        v-for="r in patientRecords"
        :key="r.id + r._s"
        :record="r"
        :debts="allDebts"
        :currency="cur"
        :payment-methods="paymentMethods"
        :doctor-pct="doctorPct"
        @edit="editRec"
        @delete="delRec"
        @go-debts="activeSection = 'debts'"
        @open-payment="openPayPopup"
        @go-patient="() => {}"
        @update-amount="updateRecAmount"
      />
    </div>

    <!-- Debts Section -->
    <div v-if="activeSection === 'debts'" class="space-y-2">
      <div v-if="!patientDebts.length" class="text-center py-10 opacity-25">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;display:block;color:var(--green)"><path d="M20 6L9 17l-5-5"/></svg>
        <p class="text-xs mt-2">لا توجد ديون</p>
      </div>
      <DebtCard
        v-for="d in patientDebts"
        :key="d.id"
        :debt="d"
        :currency="cur"
        :doctor-pct="doctorPct"
        @pay="openInstModal"
        @edit="openEditDebt"
        @delete="delDebt"
        @forgive="forgiveDebt"
        @view-payments="openPayPopup"
        @go-patient="() => {}"
        @edit-source="editSourceRecord"
      />
    </div>

    <!-- X-rays Section (same as PatientCard) -->
    <div v-if="activeSection === 'xrays'">
      <div class="glass-sm p-2.5 rounded-xl" style="background:rgba(59,130,246,.04);border-color:rgba(59,130,246,.13)">
        <p class="text-[9px] font-bold opacity-55 mb-1.5">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
          صور الأشعة ({{ xrayCount }})
        </p>
        <div v-if="xrayCount > 0" class="flex flex-wrap gap-1.5 mb-2">
          <div v-for="(img, i) in xrayList" :key="i" class="cursor-pointer" @click="openXrayViewer(i)">
            <div v-if="!xraySrc(img) && !isXrayFailed(img)" class="w-[52px] h-[52px] rounded-lg border border-white/10 flex items-center justify-center" style="background:rgba(59,130,246,.08)">
              <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,.5)" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
            </div>
            <div v-else-if="!xraySrc(img) && isXrayFailed(img)" class="w-[52px] h-[52px] rounded-lg border border-white/10 flex items-center justify-center" style="background:rgba(239,68,68,.08)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(239,68,68,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <img v-else :src="xraySrc(img)" :alt="'أشعة'" class="w-[52px] h-[52px] object-cover rounded-lg border border-white/10" loading="lazy">
          </div>
        </div>
        <p v-else class="text-[10px] opacity-30 text-center py-2">لا توجد صور أشعة</p>
        <div v-if="uploading" class="mt-1 flex items-center justify-center gap-2 text-[11px] py-2.5 rounded-xl" style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);color:var(--gold-l)">
          <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          جاري التحميل...
        </div>
        <label v-else class="xray-upload-btn mt-1 cursor-pointer flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-xl" style="background:rgba(59,130,246,.08);border:1px dashed rgba(59,130,246,.25);color:var(--gold-l)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          إرفاق صور أشعة
          <input type="file" accept="image/*" multiple class="hidden" @change="onXrayUpload">
        </label>
      </div>
      <XrayViewer :visible="xrayViewerVisible" :images="xrayList" :patientName="patientName" :startIndex="xrayViewerIndex" @close="xrayViewerVisible = false" @delete="onXrayDelete" />
    </div>

    <!-- Treatment Plan Section -->
    <div v-if="activeSection === 'plan'" class="space-y-2">
      <div v-if="!treatmentPlan.length" class="text-center py-10 opacity-25">
        <p class="text-xs">لا توجد خطة علاج — أضف مراحل أدناه</p>
      </div>
      <div v-else class="space-y-2">
        <div v-for="(s, i) in treatmentPlan" :key="s.id || i" class="row-card p-3 flex items-center gap-3">
          <div
            class="tp-check-circle"
            :class="{ done: s.done }"
            @click="toggleStage(i)"
          >
            {{ s.done ? '✓' : '' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold" :style="s.done ? 'opacity:.5;text-decoration:line-through' : ''">{{ s.desc }}</p>
            <p v-if="s.doneDate" class="text-[9px] opacity-35">أُنجز: {{ s.doneDate }}</p>
          </div>
          <button @click="removeStage(i)" class="text-[10px] px-1.5 py-0.5 rounded" style="color:var(--red);opacity:.5">✕</button>
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <input type="text" v-model="newStageDesc" class="inp flex-1 text-xs" placeholder="وصف المرحلة الجديدة..." @keyup.enter="addStage">
        <button @click="addStage" class="btn-g px-4 py-2 text-xs">+ إضافة</button>
      </div>
    </div>

    <!-- Add Visit Button (inline, not floating) -->
    <div class="mt-4 mb-6">
      <button class="btn-g w-full py-3 text-sm" @click="addVisit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        زيارة جديدة
      </button>
    </div>

    <!-- Treatment Detail Popup -->
    <Teleport to="body">
      <div v-if="showTreatmentPopup" class="fixed inset-0 z-[998] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(6px)" @click.self="showTreatmentPopup = false">
        <div class="glass w-full max-w-md rounded-2xl p-4 space-y-3 max-h-[88vh] overflow-y-auto" style="animation:centeredIn .2s ease">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm" style="color:var(--gold)">{{ treatmentPopupData?.service }}</h3>
            <button @click="showTreatmentPopup = false" class="opacity-40 hover:opacity-80 p-1">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex gap-3 text-center text-[9px]">
            <div class="flex-1 pp-stat-mini" style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.12)">
              <span class="opacity-50">المدفوع</span>
              <span class="font-bold text-green-400 n">{{ n(treatmentPopupData?.paidTotal || 0) }}</span>
            </div>
            <div class="flex-1 pp-stat-mini" style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.12)">
              <span class="opacity-50">الإجمالي</span>
              <span class="font-bold n" style="color:var(--gold)">{{ n(treatmentPopupData?.grossTotal || 0) }}</span>
            </div>
          </div>
          <!-- Records list -->
          <div class="space-y-2">
            <div v-for="rec in (treatmentPopupData?.records || [])" :key="rec.id" class="tc-detail-row">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] opacity-50">{{ rec.date || '—' }}</span>
                  <span class="text-[10px] font-bold mr-2 n" style="color:var(--gold-l)">{{ n(rec.amount || 0) }} {{ cur }}</span>
                  <span v-if="rec.debt && rec.debt.status !== 'paid'" class="text-[8px] px-1.5 py-0.5 rounded" style="background:rgba(239,68,68,.1);color:#f87171">متبقي {{ n(rec.debt.remaining || 0) }}</span>
                  <span v-else-if="rec.debt && rec.debt.status === 'paid'" class="text-[8px] px-1.5 py-0.5 rounded" style="background:rgba(34,197,94,.1);color:#4ade80">مدفوع</span>
                </div>
                <button class="tc-info-btn" @click.stop="toggleTreatmentInfo(rec.id)" :class="{ active: expandedTreatmentItem === rec.id }">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </button>
              </div>
              <!-- Expanded info -->
              <div v-if="expandedTreatmentItem === rec.id" class="tc-info-panel">
                <template v-if="rec.isPros">
                  <div class="tc-info-row"><span class="tc-info-label">معمل</span><span class="n" style="color:#f97316">{{ n(rec.labValue || 0) }}</span></div>
                  <div class="tc-info-row"><span class="tc-info-label">طبيب {{ doctorPct }}%</span><span class="n text-green-400">{{ n(rec.doctorShare || 0) }}</span></div>
                  <div class="tc-info-row"><span class="tc-info-label">عيادة {{ 100 - doctorPct }}%</span><span class="n text-blue-400">{{ n(rec.clinicShare || 0) }}</span></div>
                </template>
                <template v-else>
                  <div class="tc-info-row"><span class="tc-info-label">طبيب {{ doctorPct }}%</span><span class="n text-green-400">{{ n((rec.paid || 0) * doctorPct / 100) }}</span></div>
                  <div class="tc-info-row"><span class="tc-info-label">عيادة {{ 100 - doctorPct }}%</span><span class="n text-blue-400">{{ n((rec.paid || 0) * (100 - doctorPct) / 100) }}</span></div>
                </template>
                <div v-if="getTreatmentPayments(rec).length" class="mt-1.5 pt-1.5 border-t border-white/8">
                  <span class="text-[8px] opacity-40 block mb-1">الدفعات:</span>
                  <div v-for="(pay, pi) in getTreatmentPayments(rec)" :key="pi" class="tc-info-row">
                    <span class="text-[8px] opacity-50">{{ pay.date || '—' }}</span>
                    <span class="n text-[9px] font-bold" style="color:var(--gold-l)">{{ n(pay.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Debt Payment Popup -->
    <DebtPayPopup :visible="showPayPopup" :debtId="payPopupDebtId" @close="showPayPopup = false" @updated="showPayPopup = false" />
    <DoubleConfirm :visible="dcVisible" :title="dcTitle" :msg="dcMsg" :duration="dcDuration" @confirm="onDcConfirm" @cancel="onDcCancel" />

    <!-- Print Overlay -->
    <PrintOverlay :visible="printVisible" :title="printTitle" :html="printHtml" @close="printVisible = false" />

    <!-- Edit Patient Data Modal -->
    <Teleport to="body">
      <div v-if="editPatVisible" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="editPatVisible = false">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl">
          <h3 class="font-bold text-sm" style="color:var(--gold)">تعديل بيانات المريض</h3>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">اسم المريض</label>
            <input type="text" v-model="editPatForm.name" class="inp" placeholder="اسم المريض">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">رقم الهاتف</label>
            <input type="tel" v-model="editPatForm.phone" class="inp" placeholder="رقم الهاتف" dir="ltr">
          </div>
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">رقم ثاني (اختياري)</label>
            <input type="tel" v-model="editPatForm.phone2" class="inp" placeholder="رقم إضافي" dir="ltr">
          </div>
          <div class="flex gap-2">
            <button @click="saveEditPatientData" class="btn-g flex-1 py-3 text-xs font-bold">حفظ</button>
            <button @click="editPatVisible = false" class="btn-o px-4 py-3 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Debt Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[999] flex items-center justify-center p-4" style="background:rgba(0,0,0,.75);backdrop-filter:blur(8px)" @click.self="showEditModal = false">
        <div class="glass p-5 w-full max-w-sm space-y-4 rounded-2xl">
          <h3 class="font-bold text-sm" style="color:var(--gold)">تعديل بيانات الدين</h3>
          <input type="text" v-model="editName" class="inp" placeholder="اسم المريض">
          <div>
            <label class="text-[10px] opacity-45 mb-1 block">المبلغ الإجمالي ({{ cur }})</label>
            <input type="number" v-model.number="editTotal" class="inp" placeholder="المبلغ الإجمالي" min="0">
            <p v-if="editTotalChanged" class="text-[9px] text-orange-300 mt-1">⚠ سيتم إعادة حساب المتبقي تلقائياً</p>
          </div>
          <input type="tel" v-model="editPhone" class="inp" placeholder="رقم الهاتف">
          <textarea v-model="editNotes" class="inp h-16 resize-none text-xs" placeholder="ملاحظات"></textarea>
          <div class="flex gap-2">
            <button @click="confirmEditDebt" class="btn-g flex-1 py-3 text-xs font-bold">حفظ</button>
            <button @click="showEditModal = false" class="btn-o px-4 py-3 text-xs">إلغاء</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Actions Bottom Sheet -->
    <Teleport to="body">
      <div v-if="showActions" class="modal-ol" style="display:flex;align-items:flex-end;justify-content:center;padding:0 12px 24px" @click.self="showActions = false">
        <div class="w-full max-w-md glass p-4 rounded-t-3xl rounded-b-2xl space-y-2" @click.stop>
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm" style="color:var(--gold)">{{ patientName }}</span>
            <button @click="showActions = false" class="glass-sm w-8 h-8 flex items-center justify-center text-sm">✕</button>
          </div>
          <button v-if="waPhone" class="cp-action-btn" @click="openWhatsApp">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#25d366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span style="color:#25d366">واتساب</span>
          </button>
          <button class="cp-action-btn" @click="printPatient">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            طباعة PDF
          </button>
          <button class="cp-action-btn" @click="editPatientData">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            تعديل بيانات المريض
          </button>
          <button class="cp-action-btn" style="color:var(--red);border-color:rgba(255,68,85,.2)" @click="deletePatient">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            حذف المريض
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { usePatientsStore } from '@/stores/patients.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { useDoubleConfirm } from '@/composables/useDoubleConfirm'
import { formatNumber } from '@/utils/format'
import { sanitizeInput } from '@/utils/sanitize'
import { markMonthDirty, markDebtsDirty, markApptsDirty } from '@/services/sync.service'
import { enqueueSyncAction } from '@/services/sync-queue.service'
import { generateId } from '@/utils/uid'
import RecordRow from '@/modules/records/components/RecordRow.vue'
import { uploadXrayImage, deleteXrayImage, getThumbnailUrl, xrayVersion, isXrayFailed, preloadThumbnails } from '@/services/image.service'

const DebtCard = defineAsyncComponent(() => import('@/modules/debts/components/DebtCard.vue'))
const DebtPayPopup = defineAsyncComponent(() => import('@/components/DebtPayPopup.vue'))
const DoubleConfirm = defineAsyncComponent(() => import('@/components/DoubleConfirm.vue'))
const XrayViewer = defineAsyncComponent(() => import('@/components/XrayViewer.vue'))
const PrintOverlay = defineAsyncComponent(() => import('@/components/PrintOverlay.vue'))

const router = useRouter()
const route = useRoute()
const app = useAppStore()
const patientsStore = usePatientsStore()
const auth = useAuthStore()
const { toast } = useToast()
const { dcVisible, dcTitle, dcMsg, dcDuration, dblConfirm, onDcConfirm, onDcCancel } = useDoubleConfirm()

const n = formatNumber
const cur = computed(() => app.currency)
const clinicName = computed(() => sanitizeInput(decodeURIComponent(route.params.clinic || '')))
const patientName = computed(() => sanitizeInput(decodeURIComponent(route.params.patient || '')))
const doctorPct = computed(() => app.config?.doctorPct || 50)
const paymentMethods = computed(() => app.config?.payments || ['كاش', 'تحويل'])

const activeSection = ref('visits')
watch(activeSection, (v) => {
  if (v === 'xrays') {
    const keys = (app.config.patientXrays && app.config.patientXrays[patientName.value]) || []
    if (keys.length) preloadThumbnails(keys)
  }
})
const showActions = ref(false)
const showPayPopup = ref(false)
const payPopupDebtId = ref(null)
const showEditModal = ref(false)
const editDebtId = ref(null)
const editName = ref('')
const editPhone = ref('')
const editNotes = ref('')
const editTotal = ref(null)
const editOriginalTotal = ref(null)
const editTotalChanged = computed(() => editTotal.value !== null && editOriginalTotal.value !== null && editTotal.value !== editOriginalTotal.value)
const newStageDesc = ref('')
const uploading = ref(false)
const xrayViewerVisible = ref(false)
const xrayViewerIndex = ref(0)
const printVisible = ref(false)
const printTitle = ref('')
const printHtml = ref('')

onMounted(() => {
  if (route.query.print === '1') {
    router.replace({ ...route, query: { ...route.query, print: undefined } })
    const stopWatch = watch(patient, (p) => {
      if (p && p.entries?.length) {
        nextTick(() => { printPatient() })
        stopWatch()
      }
    }, { immediate: true })
    setTimeout(() => stopWatch(), 10000)
  }
})

const patient = computed(() => {
  const map = patientsStore.patientMap
  return map[patientName.value] || { name: patientName.value, entries: [], total: 0, grossTotal: 0, visitCount: 0, lastDate: '', services: new Set(), debtTotal: 0, debtRemaining: 0 }
})

const allDebts = computed(() => app.debts || [])

const patientRecords = computed(() => {
  const entries = patient.value.entries || []
  return [...entries]
    .filter(r => !r.isDebt)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const patientDebts = computed(() => {
  return (app.debts || []).filter(d => d.name === patientName.value && d.status !== 'paid')
})

const prosBreakdown = computed(() => {
  const pros = (app.prosthetics || []).filter(p => p.name === patientName.value && (Number(p.total || 0) > 0))
  if (!pros.length) return { hasPros: false, labTotal: 0, docShare: 0, clinShare: 0, prosTotal: 0, count: 0 }
  let labTotal = 0, docShare = 0, clinShare = 0, prosTotal = 0
  pros.forEach(p => {
    prosTotal += Number(p.total || 0) || 0
    labTotal += Number(p.labValue || 0) || 0
    docShare += Number(p.doctorShare || 0) || 0
    clinShare += Number(p.clinicShare || 0) || 0
  })
  if (prosTotal <= 0) return { hasPros: false, labTotal: 0, docShare: 0, clinShare: 0, prosTotal: 0, count: 0 }
  return { hasPros: true, labTotal, docShare, clinShare, prosTotal, count: pros.length }
})

const TC_COLORS = [
  { bg: 'rgba(234,179,8,.06)', border: 'rgba(234,179,8,.15)', text: '#eab308' },
  { bg: 'rgba(59,130,246,.06)', border: 'rgba(59,130,246,.15)', text: '#3b82f6' },
  { bg: 'rgba(34,197,94,.06)', border: 'rgba(34,197,94,.15)', text: '#22c55e' },
  { bg: 'rgba(168,85,247,.06)', border: 'rgba(168,85,247,.15)', text: '#a855f7' },
  { bg: 'rgba(249,115,22,.06)', border: 'rgba(249,115,22,.15)', text: '#f97316' },
  { bg: 'rgba(236,72,153,.06)', border: 'rgba(236,72,153,.15)', text: '#ec4899' },
]

function normalizeService(svc) {
  if (!svc) return ''
  return svc.replace(/\s*\(دفعة[^)]*\)/, '').replace(/\s*\(دين\)/, '').trim()
}

const treatmentCards = computed(() => {
  const entries = patient.value.entries || []
  const pros = (app.prosthetics || []).filter(p => p.name === patientName.value)
  const debts = (app.debts || []).filter(d => d.name === patientName.value)
  const groups = {}

  // Add prosthetics as "تركيبات"
  pros.forEach(p => {
    const svc = 'تركيبات'
    if (!groups[svc]) groups[svc] = { service: svc, isPros: true, records: [], paidTotal: 0, grossTotal: 0 }
    const total = Number(p.total || 0) || 0
    const debt = debts.find(d => d.prostheticId === p.id)
    const paid = debt ? (Number(debt.paidAmount || 0) || 0) : (p.isDebt ? 0 : total)
    groups[svc].records.push({ id: p.id, date: p.date, amount: total, paid, labValue: Number(p.labValue || 0), doctorShare: Number(p.doctorShare || 0), clinicShare: Number(p.clinicShare || 0), debt, isPros: true })
    groups[svc].paidTotal += paid
    groups[svc].grossTotal += total
  })

  // Add regular records (non-prosthetic, non-debt-payment)
  entries.forEach(r => {
    if (r._s === 'p' || r._t === 'p') return // skip prosthetics (handled above)
    if (r.isDebtPayment) return // skip debt payment entries
    if (r.isDebt && r._t !== 'p') {
      // Regular debt creation record
      const svc = normalizeService(r.service) || 'أخرى'
      if (svc === 'تركيبات') return // prosthetics handled above
      if (!groups[svc]) groups[svc] = { service: svc, isPros: false, records: [], paidTotal: 0, grossTotal: 0 }
      const amount = Number(r.amount || r.total || 0) || 0
      const debt = debts.find(d => d.recordId === r.id)
      const paid = debt ? (Number(debt.paidAmount || 0) || 0) : amount
      groups[svc].records.push({ id: r.id, date: r.date, amount, paid, debt, isPros: false })
      groups[svc].paidTotal += paid
      groups[svc].grossTotal += amount
    } else {
      // Regular record (fully paid)
      const svc = normalizeService(r.service) || 'أخرى'
      if (svc === 'تركيبات') return
      if (!groups[svc]) groups[svc] = { service: svc, isPros: false, records: [], paidTotal: 0, grossTotal: 0 }
      const amount = Number(r.amount || r.total || 0) || 0
      groups[svc].records.push({ id: r.id, date: r.date, amount, paid: amount, isPros: false })
      groups[svc].paidTotal += amount
      groups[svc].grossTotal += amount
    }
  })

  return Object.values(groups)
    .filter(g => g.grossTotal > 0)
    .sort((a, b) => b.paidTotal - a.paidTotal)
    .map((g, i) => ({ ...g, style: `background:${TC_COLORS[i % TC_COLORS.length].bg};border:1px solid ${TC_COLORS[i % TC_COLORS.length].border};--tc-color:${TC_COLORS[i % TC_COLORS.length].text}` }))
})

const showTreatmentPopup = ref(false)
const treatmentPopupData = ref(null)
const expandedTreatmentItem = ref(null)

function openTreatmentDetail(card) {
  treatmentPopupData.value = card
  expandedTreatmentItem.value = null
  showTreatmentPopup.value = true
}

function toggleTreatmentInfo(id) {
  expandedTreatmentItem.value = expandedTreatmentItem.value === id ? null : id
}

function getTreatmentPayments(record) {
  if (!record.debt) return []
  const inst = record.debt.installments || []
  return inst.map(i => ({ date: i.date, amount: Number(i.amount || 0) }))
}

const serviceTags = computed(() => {
  const svcs = patient.value.services || new Set()
  return [...svcs].slice(0, 5)
})

const moreServices = computed(() => {
  const svcs = patient.value.services || new Set()
  return Math.max(0, svcs.size - 5)
})

const treatmentPlan = computed(() => {
  return patientsStore.getTreatmentPlan(patientName.value)
})

const tpDone = computed(() => treatmentPlan.value.filter(s => s.done).length)

const waPhone = computed(() => patientsStore.getPatientPhone(patientName.value))

function goBack() {
  router.push({ name: 'clinic-patients', params: { clinic: clinicName.value } })
}

function addVisit() {
  router.push({ name: 'home', query: { patient: patientName.value, clinic: clinicName.value } })
}

function editRec(id, source) {
  router.push({ name: 'home', query: { editId: id, editSource: source } })
}

function delRec(id, source) {
  dblConfirm('حذف السجل', 'هل أنت متأكد من حذف هذا السجل؟', async () => {
    const deletedIds = [id]
    if (source === 'p') {
      const p = app.prosthetics.find(x => x.id === id)
      if (p?.date) markMonthDirty(p.date)
      if (p?.isDebt) {
        const debt = app.debts.find(d => d.prostheticId === id)
        if (debt) {
          const relatedPayRecs = app.records.filter(r => r.isDebtPayment && r.debtId === debt.id)
          relatedPayRecs.forEach(r => { deletedIds.push(r.id); markMonthDirty(r.date) })
          app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === debt.id))
          deletedIds.push(debt.id)
          app.debts = app.debts.filter(d => d.prostheticId !== id)
          markDebtsDirty()
        }
      }
      app.trackDeletionBatch(deletedIds)
      deletedIds.forEach(did => {
        enqueueSyncAction({ type: 'record_delete', table: did === id ? 'prosthetics' : 'records', recordId: did, data: { id: did } }).catch(() => {})
      })
      app.deleteProsthetic(id)
    } else {
      const r = app.records.find(x => x.id === id)
      if (r?.date) markMonthDirty(r.date)
      if (r?.isDebtPayment && r.debtId) {
        const dIdx = app.debts.findIndex(d => d.id === r.debtId)
        if (dIdx >= 0) {
          const debt = { ...app.debts[dIdx] }
          const recAmt = Number(r.amount) || 0
          const ip = debt.type === 'prosthetic'
          let fullPayAmt = recAmt
          if (debt.installments?.length) {
            const inst = debt.installments.find(ins => ins.recordId === id)
              || debt.installments.find(ins => ins.date === r.date)
            if (inst) fullPayAmt = Number(inst.amount) || recAmt
          }
          debt.paidAmount = Math.max(0, (Number(debt.paidAmount) || 0) - fullPayAmt)
          const totalDebtAmt = Number(debt.totalAmount || debt.total || 0) || 0
          debt.remaining = Math.max(0, totalDebtAmt - debt.paidAmount)
          if (debt.remaining > 0.01) debt.status = debt.paidAmount > 0.01 ? 'partial' : 'unpaid'
          else { debt.status = 'paid'; debt.remaining = 0 }
          if (ip) {
            const labVal = Number(debt.labValue || 0)
            debt.labPaid = Math.min(labVal, debt.paidAmount)
            const profitPortion = Math.max(0, debt.paidAmount - debt.labPaid)
            const dp = app.config.doctorPct || 50
            debt.doctorEarned = profitPortion * (dp / 100)
          }
          if (debt.installments?.length) {
            let instIdx = debt.installments.findIndex(ins => ins.recordId === id)
            if (instIdx < 0) instIdx = debt.installments.findIndex(ins => ins.date === r.date && (Number(ins.amount) || 0) === fullPayAmt)
            if (instIdx >= 0) debt.installments.splice(instIdx, 1)
          }
          debt._mod = Date.now()
          const updDebts = [...app.debts]
          updDebts[dIdx] = debt
          app.debts = updDebts
          markDebtsDirty()
        }
      }
      if (r?.isDebt) {
        const debt = app.debts.find(d => d.recordId === id)
        if (debt) {
          const relatedPayRecs = app.records.filter(rec => rec.isDebtPayment && rec.debtId === debt.id)
          relatedPayRecs.forEach(rec => { deletedIds.push(rec.id); markMonthDirty(rec.date) })
          app.records = app.records.filter(rec => !(rec.isDebtPayment && rec.debtId === debt.id))
          deletedIds.push(debt.id)
          app.debts = app.debts.filter(d => d.recordId !== id)
          markDebtsDirty()
        }
      }
      app.trackDeletionBatch(deletedIds)
      deletedIds.forEach(did => {
        enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: did, data: { id: did } }).catch(() => {})
      })
      app.deleteRecord(id)
    }
    app.saveToCache(auth.uid)
    await app.syncSave(auth.uid, false)
    toast('تم حذف السجل وتحديث الأرصدة')
  }, 'records')
}

function openPayPopup(debtId) {
  payPopupDebtId.value = debtId
  showPayPopup.value = true
}

function openInstModal(debtId) {
  payPopupDebtId.value = debtId
  showPayPopup.value = true
}

function openEditDebt(id) {
  const d = app.debts.find(x => x.id === id)
  if (!d) return
  editDebtId.value = id
  editName.value = d.name || ''
  editPhone.value = d.phone || ''
  editNotes.value = d.notes || ''
  const totalAmt = Number(d.totalAmount || d.total || 0)
  editTotal.value = totalAmt
  editOriginalTotal.value = totalAmt
  showEditModal.value = true
}

function confirmEditDebt() {
  const idx = app.debts.findIndex(d => d.id === editDebtId.value)
  if (idx < 0) return
  const debt = { ...app.debts[idx] }
  debt.name = editName.value.trim() || debt.name
  debt.phone = editPhone.value.trim()
  debt.notes = editNotes.value.trim()
  const totalChanged = editTotal.value !== null && editTotal.value > 0 && editTotal.value !== editOriginalTotal.value
  if (totalChanged) {
    const newTotal = editTotal.value
    const paid = Number(debt.paidAmount) || 0
    debt.totalAmount = newTotal
    debt.total = newTotal
    debt.remaining = Math.max(0, newTotal - paid)
    if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
    else if (paid > 0.01) { debt.status = 'partial' }
    else { debt.status = 'unpaid' }
  }
  debt._mod = Date.now()
  const updDebts = [...app.debts]
  updDebts[idx] = debt
  app.debts = updDebts
  if (totalChanged && debt.type === 'prosthetic' && debt.prostheticId) {
    const pIdx = app.prosthetics.findIndex(p => p.id === debt.prostheticId)
    if (pIdx >= 0) {
      const dp = doctorPct.value
      const newTotal = editTotal.value
      const lab = Number(debt.labValue || 0) || 0
      const net = newTotal - lab
      const updPros = [...app.prosthetics]
      updPros[pIdx] = { ...updPros[pIdx], total: newTotal, doctorShare: net * (dp / 100), clinicShare: net * ((100 - dp) / 100), name: debt.name, _mod: Date.now() }
      app.prosthetics = updPros
    }
  }
  if (totalChanged && debt.type === 'regular' && debt.recordId) {
    const rIdx = app.records.findIndex(r => r.id === debt.recordId)
    if (rIdx >= 0) {
      const updRecs = [...app.records]
      updRecs[rIdx] = { ...updRecs[rIdx], amount: editTotal.value, name: debt.name, _mod: Date.now() }
      app.records = updRecs
      markMonthDirty(updRecs[rIdx].date)
    }
  }
  markDebtsDirty()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم التحديث')
  showEditModal.value = false
}

function delDebt(id) {
  const debt = app.debts.find(d => d.id === id)
  if (!debt) return
  dblConfirm('حذف سجل الدين نهائياً؟', 'المريض: ' + (debt.name || '—') + '\nسيتم حذف الدين + السجل الأصلي + كل الدفعات نهائياً.', () => {
    const idsToDelete = [id]
    const relatedPayments = app.records.filter(r => r.isDebtPayment && r.debtId === id)
    relatedPayments.forEach(r => {
      if (r.id) idsToDelete.push(r.id)
      markMonthDirty(r.date)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: r.id, data: { id: r.id } }).catch(e => console.warn('[Delete] enqueue pay failed:', e))
    })
    app.records = app.records.filter(r => !(r.isDebtPayment && r.debtId === id))
    if (debt.prostheticId) {
      idsToDelete.push(debt.prostheticId)
      markMonthDirty(debt.date)
      app.prosthetics = app.prosthetics.filter(p => p.id !== debt.prostheticId)
      enqueueSyncAction({ type: 'prosthetic_delete', table: 'prosthetics', recordId: debt.prostheticId, data: { id: debt.prostheticId } }).catch(e => console.warn('[Delete] enqueue pros failed:', e))
    }
    if (debt.recordId) {
      idsToDelete.push(debt.recordId)
      markMonthDirty(debt.date)
      app.records = app.records.filter(r => r.id !== debt.recordId)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: debt.recordId, data: { id: debt.recordId } }).catch(e => console.warn('[Delete] enqueue rec failed:', e))
    }
    app.trackDeletionBatch(idsToDelete.filter(Boolean))
    app.debts = app.debts.filter(d => d.id !== id)
    enqueueSyncAction({ type: 'debt_delete', table: 'debts', recordId: id, data: { id } }).catch(e => console.warn('[Delete] enqueue debt failed:', e))
    markDebtsDirty()
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false).then(() => {
      toast('تم حذف الدين والسجل الأصلي وكل الدفعات')
    }).catch(() => {
      toast('تم الحذف محلياً — سيتم المزامنة لاحقاً')
    })
  }, 'debts')
}

function forgiveDebt(id) {
  const debt = app.debts.find(d => d.id === id)
  if (!debt || debt.status === 'paid') return
  dblConfirm('مسامحة بالمبلغ المتبقي؟', 'المريض: ' + (debt.name || '—') + '\nالمتبقي: ' + (debt.remaining || 0) + '\nسيتم تعديل الإجمالي ليعكس المدفوع فعلياً.', () => {
    const dIdx = app.debts.findIndex(d => d.id === id)
    if (dIdx < 0) return
    const now_mod = Date.now()
    const paid = Number(debt.paidAmount) || 0
    const newTotal = paid
    const updDebts = [...app.debts]
    const updDebt = { ...updDebts[dIdx], totalAmount: newTotal, total: newTotal, remaining: 0, status: 'paid', _mod: now_mod }
    updDebts[dIdx] = updDebt
    app.debts = updDebts
    enqueueSyncAction({ type: 'debt_update', table: 'debts', recordId: id, data: { id, totalAmount: newTotal, total: newTotal, remaining: 0, status: 'paid', _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue debt:', e))
    if (debt.prostheticId) {
      const pIdx = app.prosthetics.findIndex(p => p.id === debt.prostheticId)
      if (pIdx >= 0) {
        const old = app.prosthetics[pIdx]
        const lab = Number(old.labValue || 0)
        const net = newTotal - lab
        const dp = app.config.doctorPct || 50
        const updPros = [...app.prosthetics]
        updPros[pIdx] = { ...old, total: newTotal, doctorShare: Math.max(0, net * (dp / 100)), clinicShare: Math.max(0, net * ((100 - dp) / 100)), _mod: now_mod }
        app.prosthetics = updPros
        markMonthDirty(old.date)
        enqueueSyncAction({ type: 'prosthetic_update', table: 'prosthetics', recordId: debt.prostheticId, data: { id: debt.prostheticId, total: newTotal, doctorShare: Math.max(0, net * (dp / 100)), clinicShare: Math.max(0, net * ((100 - dp) / 100)), _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue pros:', e))
      }
    }
    if (debt.recordId) {
      const rIdx = app.records.findIndex(r => r.id === debt.recordId)
      if (rIdx >= 0) {
        const updRecs = [...app.records]
        updRecs[rIdx] = { ...updRecs[rIdx], amount: newTotal, _mod: now_mod }
        app.records = updRecs
        markMonthDirty(updRecs[rIdx].date)
        enqueueSyncAction({ type: 'record_update', table: 'records', recordId: debt.recordId, data: { id: debt.recordId, amount: newTotal, _mod: now_mod } }).catch(e => console.warn('[Forgive] enqueue rec:', e))
      }
    }
    markDebtsDirty()
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false).then(() => {
      toast('تم مسامحة المريض — الإجمالي الآن: ' + n(newTotal) + ' ' + cur.value)
    }).catch(() => {
      toast('تم المسامحة محلياً — سيتم المزامنة لاحقاً')
    })
  })
}

function updateRecAmount(id, newAmount, type, changes) {
  const now_mod = Date.now()
  const extra = changes || {}
  if (type === 'p') {
    const idx = app.prosthetics.findIndex(x => x.id === id)
    if (idx < 0) return
    const old = app.prosthetics[idx]
    const effectiveAmount = extra.amount !== undefined ? extra.amount : newAmount
    const lab = extra.labValue !== undefined ? extra.labValue : Number(old.labValue || 0)
    const net = effectiveAmount - lab
    const dp = doctorPct.value
    const updPros = [...app.prosthetics]
    const prosUpdates = { total: effectiveAmount, labValue: lab, doctorShare: net * (dp / 100), clinicShare: net * ((100 - dp) / 100), _mod: now_mod }
    if (extra.date) prosUpdates.date = extra.date
    if (extra.payment) prosUpdates.payment = extra.payment
    updPros[idx] = { ...old, ...prosUpdates }
    app.prosthetics = updPros
    markMonthDirty(old.date)
    if (extra.date && extra.date !== old.date) markMonthDirty(extra.date)
    enqueueSyncAction({ type: 'prosthetic_update', table: 'prosthetics', recordId: id, data: { id, ...prosUpdates } }).catch(e => console.warn('[UpdateAmount] enqueue pros:', e))
    const dIdx = app.debts.findIndex(d => d.prostheticId === id)
    if (dIdx >= 0) {
      const debt = { ...app.debts[dIdx] }
      const paid = Number(debt.paidAmount) || 0
      debt.totalAmount = effectiveAmount
      debt.total = effectiveAmount
      debt.remaining = Math.max(0, effectiveAmount - paid)
      if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
      else if (paid > 0.01) debt.status = 'partial'
      else debt.status = 'unpaid'
      debt._mod = now_mod
      const updDebts = [...app.debts]
      updDebts[dIdx] = debt
      app.debts = updDebts
      markDebtsDirty()
    }
  } else {
    const idx = app.records.findIndex(x => x.id === id)
    if (idx < 0) return
    const old = app.records[idx]
    const recUpdates = { amount: newAmount, _mod: now_mod }
    if (old._fullAmount !== undefined || old.isDebtPayment) recUpdates._fullAmount = newAmount
    if (extra.date) recUpdates.date = extra.date
    if (extra.payment) recUpdates.payment = extra.payment

    // Recalculate lab/doctor/clinic for prosthetic debt payments
    if (old.isDebtPayment && old.debtId) {
      const linkedDebt = app.debts.find(d => d.id === old.debtId)
      if (linkedDebt && linkedDebt.type === 'prosthetic') {
        const dp = app.config.doctorPct || 50
        const totalDebtAmt = Number(linkedDebt.totalAmount || linkedDebt.total || 0) || 0
        const labValue = Number(linkedDebt.labValue || 0) || 0
        const oldLabPaid = Number(linkedDebt.labPaid || 0) || 0
        const labRemaining = Math.max(0, labValue - oldLabPaid + (Number(old._labAmount || 0) || 0))
        const newLabAmount = Math.min(newAmount, labRemaining)
        const newToProfit = Math.max(0, newAmount - newLabAmount)
        const newDocAmount = newToProfit * (dp / 100)
        recUpdates._labAmount = newLabAmount
        recUpdates._docAmount = newDocAmount
      }
    }

    const updRecs = [...app.records]
    updRecs[idx] = { ...old, ...recUpdates }
    app.records = updRecs
    markMonthDirty(old.date)
    if (extra.date && extra.date !== old.date) markMonthDirty(extra.date)
    enqueueSyncAction({ type: 'record_update', table: 'records', recordId: id, data: { id, ...recUpdates } }).catch(e => console.warn('[UpdateAmount] enqueue rec:', e))
    if (old.isDebtPayment && old.debtId) {
      const dIdx = app.debts.findIndex(d => d.id === old.debtId)
      if (dIdx >= 0) {
        const debt = { ...app.debts[dIdx] }
        const oldPayAmt = Number(old.amount || 0) || 0
        const diff = newAmount - oldPayAmt
        debt.paidAmount = Math.max(0, (Number(debt.paidAmount) || 0) + diff)
        const totalDebtAmt = Number(debt.totalAmount || debt.total || 0) || 0
        debt.remaining = Math.max(0, totalDebtAmt - debt.paidAmount)
        if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
        else if (debt.paidAmount > 0.01) debt.status = 'partial'
        else debt.status = 'unpaid'
        // Recalculate labPaid and doctorEarned for prosthetic debts
        if (debt.type === 'prosthetic') {
          const oldLab = Number(old._labAmount || 0) || 0
          const newLab = Number(recUpdates._labAmount || 0) || 0
          debt.labPaid = Math.max(0, (Number(debt.labPaid) || 0) - oldLab + newLab)
          const oldDoc = Number(old._docAmount || 0) || 0
          const newDoc = Number(recUpdates._docAmount || 0) || 0
          debt.doctorEarned = Math.max(0, (Number(debt.doctorEarned) || 0) - oldDoc + newDoc)
        }
        if (debt.installments?.length) {
          let instIdx = debt.installments.findIndex(ins => ins.recordId === id)
          if (instIdx < 0) instIdx = debt.installments.findIndex(ins => ins.date === old.date && (Number(ins.amount) || 0) === oldPayAmt)
          if (instIdx >= 0) debt.installments[instIdx] = { ...debt.installments[instIdx], amount: newAmount }
        }
        debt._mod = now_mod
        const updDebts = [...app.debts]
        updDebts[dIdx] = debt
        app.debts = updDebts
        markDebtsDirty()
        enqueueSyncAction({ type: 'debt_update', table: 'debts', recordId: debt.id, data: { id: debt.id, paidAmount: debt.paidAmount, remaining: debt.remaining, status: debt.status, installments: debt.installments, labPaid: debt.labPaid, doctorEarned: debt.doctorEarned, _mod: now_mod } }).catch(e => console.warn('[UpdateAmount] enqueue debt:', e))
      }
    } else {
      const dIdx = app.debts.findIndex(d => d.recordId === id)
      if (dIdx >= 0) {
        const debt = { ...app.debts[dIdx] }
        const paid = Number(debt.paidAmount) || 0
        debt.totalAmount = newAmount
        debt.total = newAmount
        debt.remaining = Math.max(0, newAmount - paid)
        if (debt.remaining <= 0.01) { debt.status = 'paid'; debt.remaining = 0 }
        else if (paid > 0.01) debt.status = 'partial'
        else debt.status = 'unpaid'
        debt._mod = now_mod
        const updDebts = [...app.debts]
        updDebts[dIdx] = debt
        app.debts = updDebts
        markDebtsDirty()
      }
    }
  }
  patientsStore.invalidatePatientCache()
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم تحديث القيمة بنجاح')
}

function editSourceRecord(id, type) {
  app.activeTab = 'home'
  router.push({ name: 'home', query: { edit: id, type } })
}

function toggleStage(i) {
  const plans = { ...(app.config.treatmentPlans || {}) }
  const stages = [...(plans[patientName.value] || [])]
  if (!stages[i]) return
  stages[i] = { ...stages[i], done: !stages[i].done, doneDate: !stages[i].done ? new Date().toISOString().substring(0, 10) : '' }
  plans[patientName.value] = stages
  app.updateConfig({ treatmentPlans: plans })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
}

function removeStage(i) {
  const plans = { ...(app.config.treatmentPlans || {}) }
  const stages = [...(plans[patientName.value] || [])]
  stages.splice(i, 1)
  plans[patientName.value] = stages
  app.updateConfig({ treatmentPlans: plans })
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
}

function addStage() {
  const desc = newStageDesc.value.trim()
  if (!desc) return
  const plans = { ...(app.config.treatmentPlans || {}) }
  const stages = [...(plans[patientName.value] || [])]
  stages.push({ id: generateId(), desc, done: false, doneDate: '' })
  plans[patientName.value] = stages
  app.updateConfig({ treatmentPlans: plans })
  newStageDesc.value = ''
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
}

const xrayList = computed(() => (app.config.patientXrays && app.config.patientXrays[patientName.value]) || [])
const xrayCount = computed(() => xrayList.value.length)

function xraySrc(im) {
  void xrayVersion.value
  const key = typeof im === 'string' ? im : im.key
  if (!key) return im.url || im.src || ''
  if (key.startsWith('http') || key.startsWith('data:')) return key
  return getThumbnailUrl(key)
}

function openXrayViewer(index) {
  xrayViewerIndex.value = index
  xrayViewerVisible.value = true
}

async function onXrayUpload(e) {
  const files = e.target.files
  if (!files || !files.length) return
  uploading.value = true
  const name = patientName.value
  const uid = auth.uid
  const xrays = [...((app.config.patientXrays && app.config.patientXrays[name]) || [])]
  let anyQueued = false
  // Phase 2 — upload in parallel batches (max 3 at a time) instead of fully
  // sequentially, while preserving the original on-screen order of the images.
  const list = [...files]
  const CONCURRENCY = 3
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(async (file) => {
      try {
        return await uploadXrayImage(file, name, uid)
      } catch (err) {
        toast('خطأ في رفع الصورة')
        return null
      }
    }))
    for (const result of results) {
      if (!result) continue
      xrays.push(result.key)
      if (result.queued) anyQueued = true
    }
  }
  app.updateConfig({ patientXrays: { ...app.config.patientXrays, [name]: xrays } })
  app.saveToCache(uid)
  app.syncSave(uid, false)
  uploading.value = false
  if (anyQueued) {
    toast('تم حفظ الصور — سيتم رفعها تلقائياً عند الاتصال')
  } else {
    toast('تم رفع صور الأشعة بنجاح')
  }
  e.target.value = ''
}

async function onXrayDelete(index) {
  const name = patientName.value
  const xrays = [...(app.config.patientXrays?.[name] || [])]
  const removed = xrays.splice(index, 1)
  const patXrays = { ...(app.config.patientXrays || {}) }
  patXrays[name] = xrays
  app.updateConfig({ patientXrays: patXrays })
  if (removed[0] && typeof removed[0] === 'string' && !removed[0].startsWith('data:')) {
    deleteXrayImage(removed[0]).catch(() => {})
  }
  app.saveToCache(auth.uid)
  app.syncSave(auth.uid, false)
  toast('تم حذف الصورة')
  if (!xrays.length) xrayViewerVisible.value = false
}

function openWhatsApp() {
  showActions.value = false
  const phone = waPhone.value
  if (phone) {
    window.open(`https://wa.me/${phone}`, '_blank')
  }
}

function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function _palmerBorderStyle(q) {
  const b = 'display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px;font-size:8px;font-weight:800;color:#1d4ed8;border-color:#1d4ed8;border-style:solid;border-width:0;padding:1px 2px;margin:0 1px;'
  if (q === 'UR') return b + 'border-bottom-width:1.5px;border-right-width:1.5px;'
  if (q === 'UL') return b + 'border-bottom-width:1.5px;border-left-width:1.5px;'
  if (q === 'LR') return b + 'border-top-width:1.5px;border-right-width:1.5px;'
  if (q === 'LL') return b + 'border-top-width:1.5px;border-left-width:1.5px;'
  return b + 'border:1px solid #1d4ed8;border-radius:3px;'
}
function _getTeethStr(r) {
  const rep = r.report
  if (!rep) return ''
  const entries = Array.isArray(rep) ? rep : (rep.entries || [])
  const seen = new Set()
  const badges = []
  entries.forEach(e => {
    if (e.teeth && Array.isArray(e.teeth)) {
      e.teeth.forEach(t => {
        const key = (t.q || 'UR') + ':' + t.n
        if (!seen.has(key)) {
          seen.add(key)
          badges.push('<span style="' + _palmerBorderStyle(t.q || 'UR') + '">' + t.n + '</span>')
        }
      })
    }
  })
  if (!badges.length) return ''
  return '<br><span style="font-size:9px;opacity:.75">أسنان: ' + badges.join('') + '</span>'
}

function printPatient() {
  showActions.value = false
  const p = patient.value
  if (!p || !p.entries?.length) { toast('لا توجد بيانات لهذا المريض'); return }
  const patDebts = app.debts.filter(d => d.name === patientName.value)
  const totalDebtRem = patDebts.reduce((s, d) => s + (Number(d.remaining) || 0), 0)
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  const currency = _esc(app.currency)
  const dp = app.config.doctorPct || 50
  const dpR = app.config.doctorPctRegular || dp
  const serviceEntries = [...p.entries].filter(r => !r.isDebtPayment).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const paymentEntries = [...p.entries].filter(r => r.isDebtPayment).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const allPatEntries = [...p.entries, ...patDebts].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const patPhone = _esc(allPatEntries.find(r => r.phone)?.phone || '')
  const patPhone2 = _esc(allPatEntries.find(r => r.phone2)?.phone2 || '')
  let idx = 0
  let totalDocShare = 0, totalClinShare = 0, totalLabValue = 0
  let printTotalCost = 0, printTotalPaid = 0
  const svcRows = serviceEntries.map(r => {
    idx++
    const isPros = r._t === 'p' || r._s === 'p'
    const amt = Number(r.amount || r.total || 0) || 0
    printTotalCost += amt
    let debtCol = '—', paidCol, paidAmt = 0
    if (r.isDebt) {
      const dbt = isPros ? app.debts.find(d => d.prostheticId === r.id) : app.debts.find(d => d.recordId === r.id)
      paidAmt = Number(dbt?.paidAmount || 0) || 0
      const remaining = Number(dbt?.remaining ?? (amt - paidAmt)) || 0
      paidCol = paidAmt > 0 ? `<strong>${n(paidAmt)}</strong>` : '—'
      debtCol = remaining > 0 ? `<strong>${n(remaining)}</strong>` : '—'
    } else { paidAmt = amt; paidCol = `<strong>${n(amt)}</strong>` }
    printTotalPaid += paidAmt
    const payType = r.isDebt ? 'دين' : _esc(r.payment || 'كاش')
    const svcLabel = _esc(r.service) || (isPros ? 'تركيبة' : 'علاج')
    let labVal = 0, docShare = 0, clinShare = 0
    if (isPros) { labVal = Number(r.labValue || 0) || 0; docShare = Number(r.doctorShare || 0) || 0; clinShare = Number(r.clinicShare || 0) || 0 }
    else { docShare = Math.round(amt * dpR / 100 * 100) / 100; clinShare = Math.round(amt * (100 - dpR) / 100 * 100) / 100 }
    totalDocShare += docShare; totalClinShare += clinShare; totalLabValue += labVal
    const teethStr = _getTeethStr(r)
    return `<tr><td style="text-align:center">${idx}</td><td>${_esc(r.date) || '—'}</td><td style="font-weight:700">${svcLabel}${isPros ? ' (تركيبة)' : ''}${teethStr}</td><td style="text-align:center">${payType}</td><td style="text-align:center">${paidCol}</td><td style="text-align:center">${debtCol}</td></tr>`
  }).join('')
  const payRows = paymentEntries.map(r => {
    idx++
    const amt = Number(r.amount || 0) || 0
    // Note: do NOT add to printTotalPaid — debt payments are already
    // reflected in dbt.paidAmount which was counted in the service rows above.
    return `<tr><td style="text-align:center">${idx}</td><td>${_esc(r.date) || '—'}</td><td style="font-weight:600">${_esc(r.service) || 'دفعة دين'}</td><td style="text-align:center">${_esc(r.payment || 'كاش')}</td><td style="text-align:center"><strong>${n(amt)}</strong></td><td style="text-align:center">—</td></tr>`
  }).join('')
  printTitle.value = `ملف المريض — ${patientName.value}`
  printHtml.value = `
<div class="sec-title"><div class="sec-dot"></div>بيانات المريض</div>
<div class="info-grid">
  <div class="info-cell" style="grid-column:span 2"><div class="lbl">الاسم الكامل</div><div class="val">${_esc(patientName.value)}</div></div>
  <div class="info-cell"><div class="lbl">رقم الجوال</div><div class="val">${patPhone || '—'}${patPhone2 ? ' / ' + patPhone2 : ''}</div></div>
</div>
<div class="info-grid" style="margin-bottom:0">
  <div class="info-cell"><div class="lbl">عدد الزيارات</div><div class="val">${p.visitCount} زيارة</div></div>
  <div class="info-cell"><div class="lbl">العملة</div><div class="val">${currency}</div></div>
  <div class="info-cell"><div class="lbl">تاريخ التقرير</div><div class="val">${today}</div></div>
</div>
<div class="sec-title" style="margin-top:1px"><div class="sec-dot"></div>سجل الخدمات والمدفوعات</div>
<table><thead><tr><th style="width:30px;text-align:center">#</th><th style="width:75px">التاريخ</th><th>الخدمة</th><th style="width:55px;text-align:center">الدفع</th><th style="width:75px;text-align:center">المدفوع</th><th style="width:75px;text-align:center">الدين</th></tr></thead><tbody>${svcRows}${payRows}</tbody></table>
<div class="summary-grid">
  <div class="sum-card"><div class="lbl">إجمالي الخدمات</div><div class="val">${n(printTotalCost)}</div><div class="unit">${currency}</div></div>
  <div class="sum-card"><div class="lbl">المدفوع فعلياً</div><div class="val">${n(printTotalPaid)}</div><div class="unit">${currency}</div></div>
  <div class="sum-card"><div class="lbl">الرصيد المتبقي</div><div class="val">${totalDebtRem > 0 ? n(totalDebtRem) : '0'}</div><div class="unit">${currency}</div></div>
</div>
${totalDebtRem > 0 ? `<div class="debt-footer"><span class="lbl">رصيد دين مستحق على المريض</span><span class="val">${n(totalDebtRem)} ${currency}</span></div>` : ''}
<div class="sig-row">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">توقيع الطبيب</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">توقيع المريض</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">ختم المركز</div></div>
</div>`
  printVisible.value = true
}

const editPatVisible = ref(false)
const editPatForm = ref({ name: '', phone: '', phone2: '' })
const editPatOrigName = ref('')

function editPatientData() {
  showActions.value = false
  const name = patientName.value
  editPatOrigName.value = name
  const allRecs = [...app.records, ...app.prosthetics, ...app.debts]
    .filter(r => r.name === name)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  editPatForm.value = {
    name,
    phone: allRecs.find(r => r.phone)?.phone || '',
    phone2: allRecs.find(r => r.phone2)?.phone2 || '',
  }
  editPatVisible.value = true
}

function saveEditPatientData() {
  const { name, phone, phone2 } = editPatForm.value
  const origName = editPatOrigName.value
  if (!name?.trim()) return
  const mod = Date.now()
  const newName = name.trim()
  if (newName !== origName || phone || phone2) {
    let changed = false
    const updRecs = app.records.map(r => {
      if (r.name === origName) {
        changed = true
        return { ...r, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return r
    })
    if (changed) app.records = updRecs
    let changedP = false
    const updPros = app.prosthetics.map(p => {
      if (p.name === origName) {
        changedP = true
        return { ...p, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return p
    })
    if (changedP) app.prosthetics = updPros
    let changedD = false
    const updDebts = app.debts.map(d => {
      if (d.name === origName) {
        changedD = true
        return { ...d, name: newName, ...(phone ? { phone } : {}), ...(phone2 ? { phone2 } : {}), _mod: mod }
      }
      return d
    })
    if (changedD) app.debts = updDebts
    app.saveToCache(auth.uid)
    app.syncSave(auth.uid, false)
    if (newName !== origName) {
      router.replace({ name: 'patient-profile', params: { clinic: clinicName.value, patient: newName } })
    }
    toast('تم تحديث بيانات المريض')
  }
  editPatVisible.value = false
}

function deletePatient() {
  showActions.value = false
  const name = patientName.value
  const patRecs = app.records.filter(r => r.name === name)
  const patPros = app.prosthetics.filter(p => p.name === name)
  const patDebts = app.debts.filter(d => d.name === name)
  const totalEntries = patRecs.length + patPros.length
  const msg = `سيتم حذف:\n• ${patRecs.length} سجل علاج\n• ${patPros.length} سجل تركيبات\n• ${patDebts.length} سجل ديون\nإجمالي: ${totalEntries}`
  dblConfirm('حذف جميع بيانات المريض "' + name + '"؟', msg, async () => {
    const deletedIds = [
      ...patRecs.map(r => r.id),
      ...patPros.map(p => p.id),
      ...patDebts.map(d => d.id),
    ].filter(Boolean)
    app.trackDeletionBatch(deletedIds)
    patRecs.forEach(r => {
      markMonthDirty(r.date)
      enqueueSyncAction({ type: 'record_delete', table: 'records', recordId: r.id, data: { id: r.id } }).catch(e => console.warn('[Delete] enqueue rec failed:', e))
    })
    patPros.forEach(p => {
      markMonthDirty(p.date)
      enqueueSyncAction({ type: 'prosthetic_delete', table: 'prosthetics', recordId: p.id, data: { id: p.id } }).catch(e => console.warn('[Delete] enqueue pros failed:', e))
    })
    patDebts.forEach(d => {
      enqueueSyncAction({ type: 'debt_delete', table: 'debts', recordId: d.id, data: { id: d.id } }).catch(e => console.warn('[Delete] enqueue debt failed:', e))
    })
    app.records = app.records.filter(r => r.name !== name)
    app.prosthetics = app.prosthetics.filter(p => p.name !== name)
    app.debts = app.debts.filter(d => d.name !== name)
    if (app.config.treatmentPlans && app.config.treatmentPlans[name]) delete app.config.treatmentPlans[name]
    markDebtsDirty()
    app.saveToCache(auth.uid)
    await app.syncSave(auth.uid, false)
    toast('تم حذف جميع بي��نات المريض: ' + name)
    goBack()
  }, 'patients')
}
</script>

<style scoped>
.tp-check-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(59,130,246,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all .2s;
  color: transparent;
}
.tp-check-circle.done {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}
.cp-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(59,130,246,.1);
  background: rgba(59,130,246,.04);
  color: var(--gold-l);
  font-size: calc(13px * var(--fs));
  font-weight: 600;
  font-family: -apple-system,'Cairo',sans-serif;
  cursor: pointer;
  transition: all .2s;
}
.cp-action-btn:hover {
  background: rgba(59,130,246,.12);
  border-color: rgba(59,130,246,.3);
}
.pp-stat-box {
  padding: 10px 12px;
  border-radius: 12px;
  transition: all .15s;
}
.pp-stat-mini {
  padding: 6px 8px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
/* Treatment cards */
.tc-card {
  padding: 8px 6px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: all .15s;
}
.tc-card:active {
  transform: scale(.96);
  opacity: .85;
}
.tc-label {
  font-size: 8px;
  opacity: .55;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.tc-amount {
  font-size: 11px;
  font-weight: 800;
  color: var(--tc-color, var(--gold-l));
}
/* Treatment detail popup */
.tc-detail-row {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
}
.tc-info-btn {
  opacity: .4;
  padding: 4px;
  border-radius: 50%;
  transition: all .15s;
  flex-shrink: 0;
}
.tc-info-btn:hover, .tc-info-btn.active {
  opacity: 1;
  background: rgba(59,130,246,.1);
  color: var(--gold-l);
}
.tc-info-panel {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(0,0,0,.15);
  border: 1px solid rgba(255,255,255,.05);
}
.tc-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  font-size: 9px;
}
.tc-info-label {
  opacity: .5;
  font-size: 8px;
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes centeredIn {
  from { transform: scale(.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
/* Light mode overrides */
:global(body.light) .tc-detail-row {
  background: rgba(0,0,0,.02);
  border-color: rgba(0,0,0,.06);
}
:global(body.light) .tc-info-panel {
  background: rgba(0,0,0,.03);
  border-color: rgba(0,0,0,.06);
}
:global(body.light) .tc-info-btn:hover,
:global(body.light) .tc-info-btn.active {
  background: rgba(59,130,246,.08);
}
</style>
