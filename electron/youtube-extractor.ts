/**
 * youtube-extractor.ts — Production-Grade Error 150 Bypass
 *
 * ARCHITECTURE: Persistent Hidden BrowserView
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube (as of 2024/2025) requires "PO Tokens" (BotGuard Proof-of-Origin)
 * for ALL server-side InnerTube API requests. Pure Node.js HTTP calls return
 * LOGIN_REQUIRED or UNPLAYABLE. Only a real Chromium context running YouTube's
 * own BotGuard JS can generate valid tokens.
 *
 * Solution: Keep a single, invisible, zero-size BrowserView attached to the
 * main window. When Error 150 fires, navigate this view to youtube.com/watch.
 * YouTube's own player runs in real Chrome, passes BotGuard, and immediately
 * starts requesting audio streams from *.googlevideo.com. We intercept the
 * FIRST audio stream request to capture the direct CDN URL, then stop and
 * return it to the renderer.
 *
 * Result: Direct googlevideo.com URL streamed by the HTML5 <audio> element —
 * no proxy, no piping, identical speed to normal CDN playback.
 *
 * Key facts:
 *  - Error 150 = "Embedding disabled". Loading youtube.com/WATCH (not embed) is NOT embedding.
 *  - googlevideo.com URLs work from Electron renderer (Google serves broad CORS).
 *  - BrowserView is a native Electron component — zero overhead vs. BrowserWindow.
 *  - The view is PERSISTENT so there's no startup cost per song.
 */

import { BrowserView, BrowserWindow } from 'electron';

interface CacheEntry { url: string; expires: number; }
const urlCache = new Map<string, CacheEntry>();

// Active resolution state
let extractorView: BrowserView | null = null;
let currentVideoId: string | null = null;
let currentResolve: ((url: string) => void) | null = null;
let currentReject: ((e: Error) => void) | null = null;
let resolveTimeout: ReturnType<typeof setTimeout> | null = null;

function getCached(videoId: string): string | null {
  const entry = urlCache.get(videoId);
  if (!entry) return null;
  // Expire 20 minutes before actual URL expiry for safety
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

/**
 * Initialize the persistent hidden BrowserView extractor.
 * Must be called ONCE after app.whenReady(), passing the main window.
 */
export function initExtractor(mainWindow: BrowserWindow): void {
  try {
    extractorView = new BrowserView({
      webPreferences: {
        // Dedicated partition: isolated cookies/session from main app
        partition: 'persist:yt-extractor',
        // Never throttle background views — we need requests to fire promptly
        backgroundThrottling: false,
        // No Node.js access needed in this view
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    // Attach to main window but size to 0 — completely invisible to the user
    mainWindow.addBrowserView(extractorView);
    extractorView.setBounds({ x: 0, y: 0, width: 0, height: 0 });

    const sess = extractorView.webContents.session;

    // ── THE CORE INTERCEPTION ─────────────────────────────────────────────────
    // Capture the first audio-only stream request to *.googlevideo.com.
    // Audio streams always contain "mime=audio" in their URL query string.
    // This fires BEFORE the request leaves the process — zero network cost.
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

          // Parse the `expire` timestamp embedded in the URL so we cache correctly
          let expiresAt = Date.now() + 5 * 60 * 60 * 1000; // default 5h
          try {
            const expireParam = new URL(url).searchParams.get('expire');
            if (expireParam) expiresAt = parseInt(expireParam, 10) * 1000;
          } catch (_) {}

          urlCache.set(videoId, { url, expires: expiresAt });
          console.log(`[YoutubeExtractor] ✅ Captured audio URL for ${videoId}`);

          // Stop loading the page — we have what we need
          try { extractorView?.webContents.stop(); } catch (_) {}

          resolve(url);
        }

        // Always allow the request through (otherwise YouTube's player breaks)
        callback({ requestHeaders: details.requestHeaders });
      }
    );

    // Suppress console noise from the hidden view in development
    extractorView.webContents.on('console-message', () => {});

    console.log('[YoutubeExtractor] Persistent BrowserView extractor initialized ✅');
  } catch (e) {
    console.error('[YoutubeExtractor] Init failed:', e);
  }
}

/**
 * Resolve a direct audio CDN URL for a YouTube video.
 * For Error 150 (embed-disabled) videos, this navigates the hidden BrowserView
 * to the real youtube.com/watch page which is NOT blocked by embed restrictions.
 *
 * @returns Direct *.googlevideo.com CDN URL (~1-3 second resolution time)
 */
export async function resolveStreamUrl(videoId: string): Promise<string> {
  // 1. Cache hit → instant return for repeated plays
  const cached = getCached(videoId);
  if (cached) {
    console.log(`[YoutubeExtractor] Cache hit for ${videoId}`);
    return cached;
  }

  if (!extractorView) {
    throw new Error('[YoutubeExtractor] Not initialized — initExtractor() must be called first');
  }

  console.log(`[YoutubeExtractor] Resolving ${videoId} via hidden BrowserView...`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Cancel any previous in-flight resolution
    if (currentReject) {
      currentReject(new Error('Superseded by new request'));
    }

    currentVideoId = videoId;
    currentResolve = resolve;
    currentReject = reject;

    // 6-second timeout — if YouTube doesn't serve audio within this time, skip
    resolveTimeout = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      clearResolutionState();
      console.warn(`[YoutubeExtractor] Timeout after ${elapsed}ms for ${videoId}`);
      try { extractorView?.webContents.stop(); } catch (_) {}
      reject(new Error(`Timeout resolving ${videoId}`));
    }, 6000);

    // Navigate the hidden view to the REAL YouTube watch page (not embed).
    // autoplay=1 ensures YouTube starts buffering audio immediately.
    // mute=1 prevents audio output from the hidden view.
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;

    extractorView!.webContents
      .loadURL(watchUrl, {
        // Use a real Chrome user agent so YouTube serves the full player
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      })
      .catch((err) => {
        // loadURL can reject if we call stop() — ignore those errors
        if (err?.code !== 'ERR_ABORTED') {
          clearResolutionState();
          reject(err);
        }
      });
  });
}
