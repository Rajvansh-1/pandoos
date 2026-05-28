import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';

// Custom Vite Plugin to emulate Vercel Node Serverless Functions locally
const apiProxyPlugin = () => ({
  name: 'api-proxy-plugin',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      // Only intercept /api/* requests
      if (!req.url?.startsWith('/api')) return next();

      try {
        const fullUrl = `http://localhost:5173${req.url}`;
        const url = new URL(fullUrl);

        // e.g. /api/search  → search, /api/lyrics/search → lyrics/search
        const apiPath = url.pathname.replace(/^\/api\//, '');
        const filePath = path.resolve(__dirname, 'api', `${apiPath}.ts`);

        const mod = await server.ssrLoadModule(filePath);
        const handler = mod.default;

        if (typeof handler === 'function') {
          // 1. Mock Vercel's `req.query`
          req.query = Object.fromEntries(url.searchParams.entries());

          // 2. Mock Vercel's `res.status()` and `res.json()`
          res.status = (statusCode: number) => {
            res.statusCode = statusCode;
            return res;
          };

          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(data));
          };

          // Parse body for POST/PUT requests
          if (req.method === 'POST' || req.method === 'PUT') {
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            await new Promise((resolve) => req.on('end', resolve));
            const bodyStr = Buffer.concat(chunks).toString();
            try {
              req.body = JSON.parse(bodyStr);
            } catch (e) {
              req.body = bodyStr;
            }
          }

          // 3. Execute the handler with standard Node signature (req, res)
          await handler(req, res);
          return;
        }
      } catch (err: any) {
        console.error(`[API Proxy] Error handling ${req.url}:`, err?.message ?? err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err?.message ?? 'Internal server error' }));
        return;
      }
      next();
    });
  }
});

// Copies electron/preload.cjs → dist-electron/preload.cjs without any compilation.
// vite-plugin-electron outputs ESM 'import' even when format:'cjs' is set,
// which breaks Electron. A direct copy of our hand-written CJS file is the fix.
const copyPreloadPlugin = () => ({
  name: 'copy-preload',
  closeBundle() {
    const src  = path.resolve(__dirname, 'electron', 'preload.cjs');
    const dest = path.resolve(__dirname, 'dist-electron', 'preload.cjs');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('[copy-preload] Copied preload.cjs →', dest);
  },
});

// https://vitejs.dev/config/
// Path aliases are critical for Capacitor: avoids "../../../" hell in deep components
// and ensures the same import paths work when the app is bundled for native.

// When VITE_IS_NATIVE=true, we're building for Android/iOS.
// The PWA service worker MUST be disabled on native — it intercepts all network
// requests inside the Capacitor WebView (including /api/*), returning cached HTML
// instead of making real HTTP requests to the backend.
const IS_NATIVE = process.env.VITE_IS_NATIVE === 'true';

export default defineConfig({
  plugins: [
    react(),
    apiProxyPlugin(),
    electron([
      {
        // Main process: ESM is fine here
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Externalize ytdl-core so it loads as native CJS from node_modules.
              // Bundling it with Rollup breaks its internal require() calls.
              external: ['@distube/ytdl-core', 'm3u8stream', 'miniget', 'sax', 'ytmusic-api'],
              output: {
                format: 'esm',
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
      // NOTE: preload is NOT compiled by vite-plugin-electron.
      // It is copied as-is from electron/preload.cjs by copyPreloadPlugin below.
    ]),
    copyPreloadPlugin(),
    renderer(),
    // CRITICAL: DO NOT register Service Worker for native Capacitor builds.
    // The SW runs inside the Capacitor WebView at https://localhost and intercepts
    // ALL fetch requests (including /api/*), returning cached HTML instead of real data.
    // This is the #1 cause of the "stuck on loading screen" bug on physical devices.
    ...(!IS_NATIVE ? [VitePWA({
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
    })] : []),
  ],
  resolve: {
    alias: {
      // Map @/stores to the shared package to preserve existing imports during monorepo transition
      '@/stores': path.resolve(__dirname, './packages/shared/src/stores'),
      // '@/' maps to src/ — consistent across all files and Capacitor builds
      '@': path.resolve(__dirname, './src'),
    },
    // Force a single copy of React everywhere — prevents "Expected static flag" crash in Electron
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    // Pre-bundle React so vite-plugin-electron-renderer can't load a second copy
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: {
    port: 5173,
    host: true, // needed for Capacitor live reload on physical devices
    strictPort: true, // fail if 5173 is busy instead of silently switching to 5174
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
