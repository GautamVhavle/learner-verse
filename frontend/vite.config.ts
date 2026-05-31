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
      // Pin React to a single copy — prevents duplicate instances caused by
      // symlinked files in private/ resolving their own react via preserveSymlinks.
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
    },
    // Resolve imports relative to the symlink location (not the target).
    // Required for the payment submodule symlinks to find node_modules.
    preserveSymlinks: true,
    // Force a single instance of React (and ReactDOM) even when symlinked
    // files in private/ would otherwise resolve a second copy.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
