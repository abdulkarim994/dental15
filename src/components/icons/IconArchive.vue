<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 8v13H3V8"/>
    <rect x="1" y="3" width="22" height="5" rx="1.5"/>
    <path d="M10 12h4"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
