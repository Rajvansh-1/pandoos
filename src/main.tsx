import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

// TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch on mobile app foreground
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes default
    },
  },
});

// Remove Vite loading spinner if present in index.html
const loader = document.getElementById('loader');
if (loader) {
  loader.remove();
}

// Service Worker is managed by vite-plugin-pwa (autoUpdate).
// No manual registration needed — the plugin handles it automatically.

// Electron desktop uses file:// protocol, which breaks BrowserRouter.
// We must use HashRouter for the desktop app, and BrowserRouter for the web app.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ErrorBoundary>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '529626065517-rvrjir6ugvkred5ln3vuev30lfnfnsth.apps.googleusercontent.com'}>
              <App />
            </GoogleOAuthProvider>
          </ErrorBoundary>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
