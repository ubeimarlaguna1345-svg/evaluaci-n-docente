/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteApiMiddleware } from './server/middleware.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteApiMiddleware()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Si corre servidor externo en 3001
      // '/api': 'http://localhost:3001'
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
