import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/measurements': { target: 'http://localhost:8000', changeOrigin: true },
      '/auth':      { target: 'http://localhost:8000', changeOrigin: true },
      '/patients':  { target: 'http://localhost:8000', changeOrigin: true },
      '/sessions':  { target: 'http://localhost:8000', changeOrigin: true },
      '/ai':        { target: 'http://localhost:8000', changeOrigin: true },
      '/heatmap':   { target: 'http://localhost:8000', changeOrigin: true },
      '/campaigns': { target: 'http://localhost:8000', changeOrigin: true },
      '/followup':  { target: 'http://localhost:8000', changeOrigin: true },
      '/doctors':   { target: 'http://localhost:8000', changeOrigin: true },
      '/health':    { target: 'http://localhost:8000', changeOrigin: true },
    }
  }
})
