import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-excel': ['exceljs'],
          'vendor-charts': ['chart.js'],
          'vendor-qr': ['qrcode', 'html5-qrcode'],
          'vendor-zoom': ['@zoom/meetingsdk']
        }
      }
    }
  }
})
