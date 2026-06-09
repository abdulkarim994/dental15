<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
