<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" :class="{ spin: spinning }" style="color:var(--gold)">
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0115-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 01-15 6.7L3 16"/>
  </svg>
</template>
<script setup>
defineProps({
  size: { type: [Number, String], default: 22 },
  spinning: { type: Boolean, default: false },
})
</script>
