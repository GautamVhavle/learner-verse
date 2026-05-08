import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Resolve imports relative to the symlink location (not the target).
    // Required for the payment submodule symlinks to find node_modules.
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
