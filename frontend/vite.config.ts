import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(import.meta.dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Pin React to a single copy — prevents duplicate instances caused by
      // symlinked files in private/ resolving their own react via preserveSymlinks.
      'react': path.resolve(import.meta.dirname, './node_modules/react'),
      'react-dom': path.resolve(import.meta.dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(import.meta.dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(import.meta.dirname, './node_modules/react/jsx-dev-runtime'),
      // Vite 8 no longer applies this package's legacy `browser` map in every
      // lazy chunk. Pin the browser build so PDF generation never references
      // Node's global Buffer.
      '@react-pdf/png-js': path.resolve(
        import.meta.dirname,
        './node_modules/@react-pdf/png-js/lib/png-js.browser.js',
      ),
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
