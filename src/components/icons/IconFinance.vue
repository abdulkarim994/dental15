<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3"/>
    <path d="M2 10h20"/>
    <circle cx="12" cy="15" r="2"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
