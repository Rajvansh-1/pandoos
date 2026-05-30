/**
 * youtube-extractor.ts — Production-Grade Error 150/152 Bypass
 *
 * ARCHITECTURE: Persistent Hidden BrowserView + JS-Triggered Playback + Cookie Bypass
 */

import { BrowserView, BrowserWindow } from 'electron';

interface CacheEntry { url: string; expires: number; }
const urlCache = new Map<string, CacheEntry>();

let extractorView: BrowserView | null = null;
let currentVideoId: string | null = null;
let currentResolve: ((url: string) => void) | null = null;
let currentReject: ((e: Error) => void) | null = null;
let resolveTimeout: ReturnType<typeof setTimeout> | null = null;

function getCached(videoId: string): string | null {
  const entry = urlCache.get(videoId);
  if (!entry) return null;
  if (Date.now() > entry.expires - 20 * 60 * 1000) {
    urlCache.delete(videoId);
    return null;
  }
  return entry.url;
}

function clearResolutionState() {
  currentVideoId = null;
  currentResolve = null;
  currentReject = null;
  if (resolveTimeout !== null) {
    clearTimeout(resolveTimeout);
    resolveTimeout = null;
  }
}

export function initExtractor(mainWindow: BrowserWindow): void {
  try {
    extractorView = new BrowserView({
      webPreferences: {
        partition: 'persist:yt-extractor',
        backgroundThrottling: false,
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    mainWindow.addBrowserView(extractorView);
    extractorView.setBounds({ x: -10, y: -10, width: 1, height: 1 });
    extractorView.webContents.setAudioMuted(true);

    const sess = extractorView.webContents.session;

    // ── Bypass YouTube Cookie Consent Screen ──────────────────────────────────
    // This was the root cause of the timeout in production. YouTube shows a "Before you continue"
    // overlay which blocks the <video> element from rendering. We set the consent cookie manually.
    sess.cookies.set({
      url: 'https://www.youtube.com',
      name: 'CONSENT',
      value: 'YES+cb.20230214-14-p0.en+FX+874',
      domain: '.youtube.com',
      path: '/',
      secure: true,
      expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
    }).catch(console.error);

    sess.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.googlevideo.com/*'] },
      (details, callback) => {
        const url = details.url;

        if (
          currentVideoId &&
          currentResolve &&
          (url.includes('mime=audio') || url.includes('mime%3Daudio'))
        ) {
          const resolve = currentResolve;
          const videoId = currentVideoId;

          clearResolutionState();

          let expiresAt = Date.now() + 5 * 60 * 60 * 1000;
          try {
            const expireParam = new URL(url).searchParams.get('expire');
            if (expireParam) expiresAt = parseInt(expireParam, 10) * 1000;
          } catch (_) {}

          urlCache.set(videoId, { url, expires: expiresAt });
          console.log(`[YoutubeExtractor] ✅ Captured audio URL for ${videoId}`);

          try { extractorView?.webContents.loadURL('about:blank'); } catch (_) {}
          resolve(url);
        }

        callback({ requestHeaders: details.requestHeaders });
      }
    );

    extractorView.webContents.on('did-finish-load', () => {
      if (!currentVideoId) return;

      // Inject robust playback script that bypasses popups and forces playback
      extractorView!.webContents.executeJavaScript(`
        (function() {
          const mute = (v) => { v.muted = true; v.volume = 0; };
          const tryPlay = () => {
            // Dismiss any lingering dialogs
            const buttons = document.querySelectorAll('button, yt-button-renderer');
            buttons.forEach(b => {
               if(b.textContent && b.textContent.toLowerCase().includes('accept')) {
                 b.click();
               }
            });

            const v = document.querySelector('video');
            if (v) {
              mute(v);
              v.play().catch(() => {});
              return true;
            }
            return false;
          };
          
          if (!tryPlay()) {
            setTimeout(() => tryPlay(), 1000);
            setTimeout(() => tryPlay(), 2500);
            setTimeout(() => tryPlay(), 5000);
          }
        })();
      `).catch(() => {});
    });

    extractorView.webContents.on('console-message', () => {});
    console.log('[YoutubeExtractor] Initialized ✅ (Cookie Bypass Active)');
  } catch (e) {
    console.error('[YoutubeExtractor] Init failed:', e);
  }
}

export async function resolveStreamUrl(videoId: string): Promise<string> {
  const cached = getCached(videoId);
  if (cached) return cached;

  if (!extractorView) throw new Error('[YoutubeExtractor] Not initialized');

  return new Promise((resolve, reject) => {
    if (currentReject) currentReject(new Error('Superseded by new request'));

    currentVideoId = videoId;
    currentResolve = resolve;
    currentReject = reject;

    resolveTimeout = setTimeout(() => {
      clearResolutionState();
      try { extractorView?.webContents.loadURL('about:blank'); } catch (_) {}
      reject(new Error(`Timeout resolving ${videoId}`));
    }, 15000);

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    extractorView!.webContents.loadURL(watchUrl).catch((err) => {
      if (err?.code !== 'ERR_ABORTED') {
        clearResolutionState();
        reject(err);
      }
    });
  });
}
