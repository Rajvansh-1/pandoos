/**
 * youtube-extractor.ts — Production-Grade Error 150/152 Bypass
 *
 * ARCHITECTURE: Persistent Hidden BrowserView + JS-Triggered Playback
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube IFrame Error 152/150 fires when the embed origin (127.0.0.1:15432 in
 * production) is not whitelisted by the video owner. The HTTP header spoof in
 * main.ts fixes the HTTP Origin header, but YouTube's IFrame also checks the
 * `origin` QUERY PARAMETER in the embed URL — which we can't spoof.
 *
 * Solution: Persistent hidden BrowserView that loads youtube.com/watch (not
 * embed). After load, we call executeJavaScript to trigger video.play(). This
 * is the CRITICAL FIX — executeJavaScript runs in a trusted main-process
 * context which Chromium treats as a user-gesture equivalent, bypassing the
 * autoplay block that kills the URL=autoplay=1 approach in packaged builds.
 *
 * We intercept the first *.googlevideo.com audio stream request to get the
 * direct CDN URL, then return it to the renderer for HTML5 <audio> playback.
 *
 * FIXES vs previous broken implementation:
 *   1. setAudioMuted(true) — permanently mutes hidden view (no ghost audio)
 *   2. did-finish-load + executeJavaScript → video.play() — THE REAL FIX
 *      (previous version relied on autoplay=1 URL param which is blocked in prod)
 *   3. video.muted = true in JS — double mute protection
 *   4. about:blank on success — stops YouTube from running in background
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

/**
 * Initialize the persistent hidden BrowserView extractor.
 * Call ONCE after app.whenReady(), after createWindow().
 */
export function initExtractor(mainWindow: BrowserWindow): void {
  try {
    extractorView = new BrowserView({
      webPreferences: {
        partition: 'persist:yt-extractor', // isolated cookies — never touched by main app
        backgroundThrottling: false,       // never throttle — we need requests to fire fast
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    mainWindow.addBrowserView(extractorView);
    // Keep at -10,-10 so it is technically off-screen but NOT zero-size.
    // A zero-size view can trigger extra Chromium resource-saving optimizations.
    extractorView.setBounds({ x: -10, y: -10, width: 1, height: 1 });

    // ── CRITICAL: Permanently mute the hidden view ────────────────────────────
    // This prevents ANY audio from the hidden YouTube page reaching the user.
    extractorView.webContents.setAudioMuted(true);

    const sess = extractorView.webContents.session;

    // ── INTERCEPT audio stream requests ──────────────────────────────────────
    // Googlevideo.com audio URLs always contain mime=audio in their query string.
    // We capture the FIRST such URL and return it to the renderer.
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

          // Parse the CDN URL's `expire` timestamp for accurate cache TTL
          let expiresAt = Date.now() + 5 * 60 * 60 * 1000; // default 5h
          try {
            const expireParam = new URL(url).searchParams.get('expire');
            if (expireParam) expiresAt = parseInt(expireParam, 10) * 1000;
          } catch (_) {}

          urlCache.set(videoId, { url, expires: expiresAt });
          console.log(`[YoutubeExtractor] ✅ Captured audio URL for ${videoId}`);

          // Navigate to about:blank — stops YouTube completely, kills any background audio
          try { extractorView?.webContents.loadURL('about:blank'); } catch (_) {}

          resolve(url);
        }

        // Always allow the request — blocking it would break YouTube's player
        callback({ requestHeaders: details.requestHeaders });
      }
    );

    // ── THE KEY FIX: JS-triggered playback ───────────────────────────────────
    // In packaged Electron builds, `autoplay=1` in the YouTube URL is IGNORED
    // because Chromium's autoplay policy requires a user gesture. No user gesture
    // = no autoplay = no audio stream request = timeout = skip.
    //
    // executeJavaScript() runs from the MAIN PROCESS context, which Chromium
    // treats as a trusted user-gesture equivalent. So video.play() succeeds
    // even without a real user click. This is the production-safe fix.
    extractorView.webContents.on('did-finish-load', () => {
      // Skip if no active resolution (e.g., loading about:blank on success)
      if (!currentVideoId) return;

      extractorView!.webContents.executeJavaScript(`
        (function() {
          const mute = (v) => { v.muted = true; v.volume = 0; };
          const tryPlay = () => {
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) {
              videos.forEach(v => { mute(v); v.play().catch(() => {}); });
              return true;
            }
            return false;
          };
          // Attempt immediately, then retry with backoff
          // YouTube's player may not have rendered the <video> element yet
          if (!tryPlay()) {
            setTimeout(() => tryPlay(), 800);
            setTimeout(() => tryPlay(), 2000);
            setTimeout(() => tryPlay(), 4000);
          }
        })();
      `).catch(() => {});
    });

    // Silence console noise from the hidden YouTube page
    extractorView.webContents.on('console-message', () => {});

    console.log('[YoutubeExtractor] Initialized ✅ (JS-triggered playback, muted, isolated session)');
  } catch (e) {
    console.error('[YoutubeExtractor] Init failed:', e);
  }
}

/**
 * Resolve a direct audio CDN URL for a YouTube video.
 * Returns a *.googlevideo.com URL that the HTML5 <audio> element can play directly.
 * Average resolution time: 2–5 seconds (page load + YT player init + stream start).
 */
export async function resolveStreamUrl(videoId: string): Promise<string> {
  // Cache hit → return instantly (URL valid for ~5h from YouTube's CDN)
  const cached = getCached(videoId);
  if (cached) {
    console.log(`[YoutubeExtractor] Cache hit for ${videoId}`);
    return cached;
  }

  if (!extractorView) {
    throw new Error('[YoutubeExtractor] Not initialized — call initExtractor() first');
  }

  console.log(`[YoutubeExtractor] Resolving ${videoId} via BrowserView...`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Cancel any previous in-flight resolution
    if (currentReject) {
      currentReject(new Error('Superseded by new request'));
    }

    currentVideoId = videoId;
    currentResolve = resolve;
    currentReject = reject;

    // 15-second timeout — generous enough for slow connections + YouTube init time
    resolveTimeout = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      clearResolutionState();
      console.warn(`[YoutubeExtractor] Timeout after ${elapsed}ms for ${videoId}`);
      try { extractorView?.webContents.loadURL('about:blank'); } catch (_) {}
      reject(new Error(`Timeout resolving ${videoId}`));
    }, 15000);

    // Navigate to the FULL youtube.com/watch page — NOT embed.
    // Full page: no embedding restriction, real YouTube player, real CDN requests.
    // NO autoplay=1 in URL — we trigger play via executeJavaScript instead.
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    extractorView!.webContents
      .loadURL(watchUrl, {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      })
      .catch((err) => {
        if (err?.code !== 'ERR_ABORTED') {
          clearResolutionState();
          reject(err);
        }
      });
  });
}
