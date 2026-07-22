import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // react-draggable (a react-grid-layout dependency) reads process.env.NODE_ENV at
  // runtime rather than through statically-analyzable import.meta.env — Vite doesn't
  // shim a `process` global by default, so without this it throws in the browser.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
})
