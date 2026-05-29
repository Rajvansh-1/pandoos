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
              external: ['@distube/ytdl-core', 'm3u8stream', 'miniget', 'sax', 'ytmusic-api', 'youtube-dl-exec'],
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
    // PWA — always enabled. Production-grade service worker with aggressive caching.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webp}'],
        // Skip waiting + claim clients = instant activation of new SW
        skipWaiting: true,
        clientsClaim: true,
        // Navigation preload for instant page loads
        navigationPreload: true,
        runtimeCaching: [
          // YouTube thumbnails — cache-first, huge capacity
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // LRCLIB lyrics — cache-first (lyrics rarely change)
          {
            urlPattern: /^https:\/\/lrclib\.net\/api\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lyrics-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts stylesheets — stale-while-revalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          // Google Fonts webfonts — cache-first, very long TTL
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // API search/trending — network-first with cache fallback for offline
          {
            urlPattern: /\/api\/(search|trending|oracle)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            }
          },
        ],
      },
      manifest: {
        name: 'Pandoos',
        short_name: 'Pandoos',
        description: 'Feel the music — a premium music streaming experience powered by Pandas 🐼',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['music', 'entertainment'],
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Search Music',
            short_name: 'Search',
            url: '/search',
            icons: [{ src: '/logo.png', sizes: '192x192' }]
          },
          {
            name: 'Your Library',
            short_name: 'Library',
            url: '/library',
            icons: [{ src: '/logo.png', sizes: '192x192' }]
          },
        ],
      },
    }),
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
    host: true,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Rollup output options
      },
    },
  },
});
