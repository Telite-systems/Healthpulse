import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/n8n/* requests are forwarded to the local n8n instance
      // This avoids CORS issues during development.
      '/api/n8n': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },
})
