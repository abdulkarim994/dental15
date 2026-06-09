<template>
  <div class="space-y-4">
    <!-- Section Selector -->
    <div class="finance-tabs">
      <button
        v-for="s in sections"
        :key="s.id"
        class="finance-tab"
        :class="{ 'ft-on': activeSection === s.id }"
        @click="activeSection = s.id"
      >
        <component :is="s.icon" :size="16" />
        {{ s.label }}
        <span v-if="s.id === 'debts' && debtBadge > 0" class="ft-badge">{{ debtBadge }}</span>
      </button>
    </div>

    <!-- Active Section Content -->
    <keep-alive>
      <TreasuryTab v-if="activeSection === 'treasury'" />
    </keep-alive>
    <keep-alive>
      <DebtsTab v-if="activeSection === 'debts'" />
    </keep-alive>
    <keep-alive>
      <ProfitsTab v-if="activeSection === 'profits'" />
    </keep-alive>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onDeactivated, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import IconTreasury from '@/components/icons/IconTreasury.vue'
import IconDebts from '@/components/icons/IconDebts.vue'
import IconProfits from '@/components/icons/IconProfits.vue'

const TreasuryTab = defineAsyncComponent(() => import('@/modules/treasury/TreasuryTab.vue'))
const DebtsTab = defineAsyncComponent(() => import('@/modules/debts/DebtsTab.vue'))
const ProfitsTab = defineAsyncComponent(() => import('@/modules/profits/ProfitsTab.vue'))

const route = useRoute()
const app = useAppStore()

const sections = [
  { id: 'treasury', label: 'الخزينة', icon: IconTreasury },
  { id: 'debts', label: 'الديون', icon: IconDebts },
  { id: 'profits', label: 'الأرباح', icon: IconProfits },
]

const activeSection = ref('treasury')

onMounted(() => {
  if (route.query.section) {
    activeSection.value = route.query.section
  }
})

onDeactivated(() => {
  if (app.config.keepTabState !== true) {
    activeSection.value = 'treasury'
  }
})

const debtBadge = computed(() => {
  return (app.debts || []).filter(d => d.status !== 'paid').length
})
</script>

<style scoped>
.finance-tabs {
  display: flex;
  gap: 8px;
}
.finance-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 14px;
  font-size: calc(12px * var(--fs));
  font-weight: 600;
  font-family: -apple-system,'Cairo',sans-serif;
  border: 1px solid rgba(59,130,246,.12);
  background: rgba(59,130,246,.04);
  color: rgba(220,230,245,.4);
  cursor: pointer;
  transition: all .22s cubic-bezier(0.16,1,0.3,1);
  position: relative;
  white-space: nowrap;
}
.finance-tab:hover {
  background: rgba(59,130,246,.08);
  border-color: rgba(59,130,246,.25);
}
.finance-tab.ft-on {
  background: var(--gold-g);
  color: #fff;
  font-weight: 800;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(59,130,246,.3);
}
.finance-tab svg {
  opacity: .5;
  transition: opacity .2s;
}
.finance-tab.ft-on svg {
  opacity: 1;
}
.ft-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 50%;
  background: var(--red);
  color: #fff;
  font-size: 8px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: dPulse 2s infinite;
}
/* Light mode overrides */
:global(body.light) .finance-tab {
  background: rgba(59,130,246,.1);
  border: 1.5px solid rgba(59,130,246,.3);
  color: #1e3a5f;
  font-weight: 700;
}
:global(body.light) .finance-tab:hover {
  background: rgba(59,130,246,.18);
  border-color: rgba(59,130,246,.45);
  color: #0f2a4a;
}
:global(body.light) .finance-tab.ft-on {
  background: linear-gradient(135deg,#2563eb,#1d4ed8);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(37,99,235,.35);
  font-weight: 800;
}
:global(body.light) .finance-tab svg {
  opacity: .8;
}
:global(body.light) .finance-tab.ft-on svg {
  opacity: 1;
}
</style>
