<template>
  <div class="skeleton-wrap" :style="{ gap: gap + 'px' }">
    <div v-for="i in count" :key="i" class="skeleton-item" :class="variant" :style="itemStyle">
      <template v-if="variant === 'card'">
        <div class="sk-line sk-title" />
        <div class="sk-line sk-text" />
        <div class="sk-line sk-text short" />
      </template>
      <template v-else-if="variant === 'row'">
        <div class="sk-circle" />
        <div class="sk-lines">
          <div class="sk-line sk-text" />
          <div class="sk-line sk-text short" />
        </div>
      </template>
      <template v-else>
        <div class="sk-line" :style="{ height: height }" />
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 3 },
  variant: { type: String, default: 'card' },
  height: { type: String, default: '16px' },
  gap: { type: Number, default: 12 },
  itemStyle: { type: Object, default: () => ({}) },
})
</script>

<style scoped>
.skeleton-wrap { display: flex; flex-direction: column }
.skeleton-item { border-radius: 16px; padding: 16px; background: rgba(255,255,255,.04) }
.skeleton-item.row { display: flex; align-items: center; gap: 12px; padding: 12px 16px }
.sk-line { border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite }
.sk-title { height: 18px; width: 60%; margin-bottom: 10px }
.sk-text { height: 14px; width: 90%; margin-bottom: 6px }
.sk-text.short { width: 45% }
.sk-circle { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%); background-size: 200% 100%; animation: sk-shimmer 1.5s infinite }
.sk-lines { flex: 1 }
@keyframes sk-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
</style>
