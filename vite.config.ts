import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Порт можно задать через PORT, иначе привычный 5173.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
  },
})
