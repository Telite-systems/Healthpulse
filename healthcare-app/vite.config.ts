import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Backend API — all /api/* requests → FastAPI on port 8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // n8n webhooks — /webhook/* requests → n8n on port 5678
      '/webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
      // Backend WebSocket — /ws → FastAPI WS on port 8000
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
