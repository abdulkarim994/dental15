<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="7" r="4"/>
    <path d="M3 21v-2a7 7 0 0114 0v2"/>
    <path d="M16 11l2 2 4-4" stroke-width="2"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
