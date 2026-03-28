/**
 * Application entry point — sets up React Query, auth provider, and mounts the router.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './lib/auth'
import AppRouter from './router'
import { Toaster } from './components/ui/sonner'
import { useThemeStore } from './stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

// Hydrate theme store so the correct class is applied immediately
useThemeStore.getState();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
