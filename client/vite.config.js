import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3001'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': apiTarget,
      '/auth': apiTarget,
      '/assets': apiTarget,
      '/stylesheets': apiTarget,
    },
  },
})
