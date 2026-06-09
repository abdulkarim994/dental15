<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 9h20v11a2 2 0 01-2 2H4a2 2 0 01-2-2V9z"/>
    <path d="M22 9V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2"/>
    <circle cx="17" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
