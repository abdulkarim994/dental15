<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
    <circle cx="12" cy="12" r="9.5"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 28 } })
</script>
