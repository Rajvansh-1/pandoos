import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '529626065517-rvrjir6ugvkred5ln3vuev30lfnfnsth.apps.googleusercontent.com'}>
              <App />
            </GoogleOAuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
