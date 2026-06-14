import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) {
            return 'vendor-react'
          }
          if (id.includes('@tiptap')) {
            return 'vendor-editor'
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query'
          }
          return undefined
        },
      },
    },
  },
})
