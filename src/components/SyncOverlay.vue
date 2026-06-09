<template>
  <div v-if="appStore.syncing" class="sync-ol">
    <div style="width:80px;height:80px">
      <svg viewBox="0 0 80 80" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hpGrd" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#506070"/>
            <stop offset="48%" stop-color="#8a9aaa"/>
            <stop offset="100%" stop-color="#506070"/>
          </linearGradient>
        </defs>
        <path d="M15,42 Q11,23 23,15 Q32,9 37,20 Q42,9 51,15 Q63,23 59,42 L56,63 Q53,75 44,72 Q39,75 34,72 Q25,75 22,63 Z" fill="#ddeaff" stroke="#9ab0cc" stroke-width="1.5"/>
        <path d="M23,18 Q28,14 34,17 Q30,25 25,29 Q20,24 23,18Z" fill="white" opacity=".52"/>
        <path d="M22,42 Q30,37 37,40 Q44,37 53,42" fill="none" stroke="#b0c5de" stroke-width=".75" opacity=".7"/>
        <g class="tdd"><g class="tdv">
          <rect x="28" y="-18" width="23" height="27" rx="6.5" fill="url(#hpGrd)" stroke="#4a5a6a" stroke-width=".8"/>
          <line x1="31" y1="-7" x2="49" y2="-7" stroke="rgba(255,255,255,.13)" stroke-width=".7"/>
          <line x1="31" y1="-1" x2="49" y2="-1" stroke="rgba(255,255,255,.13)" stroke-width=".7"/>
          <line x1="31" y1="5" x2="49" y2="5" stroke="rgba(255,255,255,.13)" stroke-width=".7"/>
          <ellipse cx="39.5" cy="9" rx="11.5" ry="4.2" fill="#354555" stroke="#4a5a6a" stroke-width=".7"/>
          <rect x="33" y="8" width="13" height="9" rx="3.5" fill="#28383a" stroke="#3a4a50" stroke-width=".6"/>
          <rect x="33" y="8.5" width="13" height="2" rx="1" fill="rgba(59,130,246,.3)"/>
          <rect x="38.5" y="17" width="3" height="14" rx="1.3" fill="#c0d2e5"/>
          <path d="M37.5,31 L41.5,31 L39.5,36 Z" fill="#cddbe8"/>
          <circle class="tdw tw1" cx="33" cy="28" r="2.1" fill="#4ab2ff"/>
          <circle class="tdw tw2" cx="47" cy="27" r="1.6" fill="#60bcff"/>
          <circle class="tdw tw3" cx="36" cy="33" r="1.6" fill="#4ab2ff"/>
        </g></g>
      </svg>
    </div>
    <div class="text-center space-y-1">
      <p class="text-base font-black" style="color:var(--gold)">{{ appStore.syncMessage }}</p>
      <p class="text-xs opacity-40">يرجى الانتظار</p>
    </div>
    <div class="w-52 prog-bar mx-auto">
      <div class="prog-fill" :style="{ width: appStore.syncProgress + '%' }" />
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app.store'
const appStore = useAppStore()
</script>
