import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
// Path aliases are critical for Capacitor: avoids "../../../" hell in deep components
// and ensures the same import paths work when the app is bundled for native.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // workbox pre-caches the app shell so first load is instant offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webp}'],
        // Cache music-related API responses and fonts for offline fallback
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/(search|trending).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pandoos-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
              networkTimeoutSeconds: 3, // fallback to cache quickly if network is slow
            }
          }
        ],
      },
      manifest: {
        name: 'Pandoos Music',
        short_name: 'Pandoos',
        description: 'The Panda-powered music experience',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // '@/' maps to src/ — consistent across all files and Capacitor builds
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // needed for Capacitor live reload on physical devices
  },
  build: {
    target: 'es2020', // Capacitor WebView supports ES2020
    rollupOptions: {
      output: {
        // Rollup output options
      },
    },
  },
});
