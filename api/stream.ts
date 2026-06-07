import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytdl from '@distube/ytdl-core';

// In-memory URL cache — YouTube CDN URLs expire in ~6 hours, we cache for 4h
const urlCache = new Map<string, { url: string; mime: string; expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS for Capacitor native app ──────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    // ── Cache hit ─────────────────────────────────────────────────────────────
    const cached = urlCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Stream API] Cache hit for ${videoId}`);
      return res.status(200).json({ url: cached.url, mimeType: cached.mime });
    }

    console.log(`[Stream API] Fetching fresh URL for ${videoId}...`);

    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
      requestOptions: {
        headers: {
          // Mimic a real browser — helps avoid bot detection
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A156E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    // Prefer m4a (audio/mp4) — universally supported on Android via ExoPlayer & NativeAudio
    // Opus/WebM is smaller but needs container parsing that NativeAudio preload doesn't always handle
    const m4aFormat = ytdl.chooseFormat(info.formats, {
      filter: (f) => f.hasAudio && !f.hasVideo && f.container === 'mp4',
      quality: 'highestaudio',
    });

    // Fallback: any audio-only stream
    const fallbackFormat = !m4aFormat
      ? ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' })
      : null;

    const format = m4aFormat || fallbackFormat;

    if (!format || !format.url) {
      console.error(`[Stream API] No playable format for ${videoId}`);
      return res.status(404).json({ error: 'No playable audio format found' });
    }

    const streamUrl = format.url;
    const mimeType = format.mimeType || 'audio/mp4';

    console.log(`[Stream API] ✅ Got URL for ${videoId} | ${mimeType} | ${format.audioBitrate}kbps`);

    // Cache for 4 hours
    urlCache.set(videoId, { url: streamUrl, mime: mimeType, expiresAt: Date.now() + 4 * 60 * 60 * 1000 });

    // Evict old entries if cache grows large
    if (urlCache.size > 200) {
      const now = Date.now();
      for (const [key, val] of urlCache.entries()) {
        if (val.expiresAt < now) urlCache.delete(key);
      }
    }

    return res.status(200).json({ url: streamUrl, mimeType });
  } catch (error: any) {
    console.error(`[Stream API] Error for ${videoId}:`, error.message);
    return res.status(500).json({ error: error.message || 'Failed to get stream URL' });
  }
}
