import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vue-vendor'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('modules/patients')) return 'mod-patients'
          if (id.includes('modules/calendar')) return 'mod-calendar'
          if (id.includes('modules/debts')) return 'mod-debts'
          if (id.includes('modules/records')) return 'mod-records'
          if (id.includes('modules/profits')) return 'mod-profits'
          if (id.includes('modules/archive')) return 'mod-archive'
          if (id.includes('modules/treasury')) return 'mod-treasury'
          if (id.includes('modules/xrays')) return 'mod-xrays'
          if (id.includes('modules/treatments')) return 'mod-treatments'
          if (id.includes('modules/settings')) return 'mod-settings'
          if (id.includes('modules/reports')) return 'mod-reports'
          if (id.includes('modules/prosthetics')) return 'mod-prosthetics'
          if (id.includes('services/image-pipeline') || id.includes('services/image.service') || id.includes('services/r2.service')) return 'image-services'
          if (id.includes('services/sqlite') || id.includes('services/db-adapter') || id.includes('repositories/')) return 'offline-layer'
        },
      },
    },
  },
})
