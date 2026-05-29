import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────────
// Guaranteed audio streaming via yt-dlp (youtube-dl-exec)
//
// yt-dlp is the industry-standard YouTube downloader used by:
//   - VLC, Kodi, MPV, Jellyfin, and thousands of media apps
//   - It is actively maintained and updated within days of YouTube changes
//
// youtube-dl-exec automatically downloads and caches the correct yt-dlp binary
// for the current platform (Windows .exe / macOS / Linux) on first use.
//
// This runs in Electron's Node.js process — full native binary access.
// ─────────────────────────────────────────────────────────────────────────────

// Dynamic import to avoid bundling issues in Vercel edge (this runs in Electron only)
let youtubeDlFn: any = null;

async function getYoutubeDl() {
  if (youtubeDlFn) return youtubeDlFn;
  try {
    const { create } = await import('youtube-dl-exec') as any;
    
    // In packaged Electron, the binary is in process.resourcesPath/bin/
    // In dev mode, youtube-dl-exec uses its own bundled binary automatically
    const binaryPath = (process as any).resourcesPath
      ? require('path').join((process as any).resourcesPath, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
      : undefined; // Let youtube-dl-exec auto-detect in dev

    youtubeDlFn = binaryPath && require('fs').existsSync(binaryPath)
      ? create(binaryPath)
      : (await import('youtube-dl-exec') as any).default;

    return youtubeDlFn;
  } catch (e) {
    console.error('[Download API] Failed to load youtube-dl-exec:', e);
    return null;
  }
}

export const config = {
  api: {
    responseLimit: '50mb',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing videoId parameter' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const ydl = await getYoutubeDl();

    if (!ydl) {
      console.log('[Download API] yt-dlp not available, falling back to ytdl-core...');
      const ytdl = require('@distube/ytdl-core');
      const info = await ytdl.getInfo(videoUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      });

      const formats = info.formats.filter((f: any) => f.hasAudio && !f.hasVideo && f.url);
      if (formats.length === 0) {
        return res.status(451).json({ error: 'No playable audio format found.' });
      }

      formats.sort((a: any, b: any) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
      const preferOpus = formats.find((f: any) => f.mimeType?.includes('opus')) || formats[0];

      const streamUrl = preferOpus.url;
      const mimeType = preferOpus.mimeType?.split(';')[0] || 'audio/webm';
      
      console.log(`[Download API] Streaming ${videoId} via ytdl-core | format: ${mimeType}`);
      
      const rangeHeader = req.headers['range'] as string;
      const streamRes = await fetch(streamUrl, {
        headers: { ...(rangeHeader ? { 'Range': rangeHeader } : {}) },
      });

      if (!streamRes.ok && streamRes.status !== 206) {
        return res.status(streamRes.status).json({ error: `Stream error: ${streamRes.status}` });
      }

      res.writeHead(streamRes.status, {
        'Content-Type': mimeType,
        'Content-Length': streamRes.headers.get('content-length') || '',
        'Content-Range': streamRes.headers.get('content-range') || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });

      const reader = streamRes.body?.getReader();
      if (!reader) { res.end(); return; }

      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        const canContinue = res.write(Buffer.from(value));
        if (!canContinue) {
          await new Promise(resolve => (res as any).once('drain', resolve));
        }
      }
      return;
    }

    console.log(`[Download API] Extracting audio URL for ${videoId} via yt-dlp...`);

    // Step 1: Get the direct audio stream URL (no download — just the URL)
    // yt-dlp handles all cipher decryption, bot detection, and format selection
    const result = await ydl(videoUrl, {
      format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      getUrl: true,           // Print URL, don't download
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:https://www.youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ],
    });

    // yt-dlp returns the URL as a string (with --get-url flag)
    const streamUrl = (typeof result === 'string' ? result : result?.url || '').trim();

    if (!streamUrl || !streamUrl.startsWith('http')) {
      console.error(`[Download API] yt-dlp returned invalid URL for ${videoId}:`, streamUrl?.substring(0, 100));
      return res.status(451).json({ error: 'Could not extract audio URL — video may be unavailable' });
    }

    console.log(`[Download API] Got stream URL for ${videoId} — proxying...`);

    // Step 2: Proxy the stream (avoids CORS and auth issues in renderer)
    const rangeHeader = req.headers['range'] as string;
    const streamRes = await fetch(streamUrl, {
      headers: {
        ...(rangeHeader ? { 'Range': rangeHeader } : {}),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    });

    if (!streamRes.ok && streamRes.status !== 206) {
      console.error(`[Download API] Stream fetch returned ${streamRes.status} for ${videoId}`);
      return res.status(streamRes.status).json({ error: `Stream error: ${streamRes.status}` });
    }

    // Detect MIME type from the URL or content-type
    const contentType = streamRes.headers.get('content-type') || 'audio/webm';
    const mimeType = contentType.split(';')[0];

    res.writeHead(streamRes.status, {
      'Content-Type': mimeType,
      'Content-Length': streamRes.headers.get('content-length') || '',
      'Content-Range': streamRes.headers.get('content-range') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });

    // Stream bytes to client with back-pressure handling
    const reader = streamRes.body?.getReader();
    if (!reader) { res.end(); return; }

    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      const canContinue = res.write(Buffer.from(value));
      if (!canContinue) {
        await new Promise(resolve => (res as any).once('drain', resolve));
      }
    }

  } catch (error: any) {
    const msg = error.message || 'Internal Server Error';
    console.error(`[Download API] yt-dlp error for ${videoId}:`, msg.substring(0, 200));
    if (!res.headersSent) {
      const isUnavailable = msg.includes('unavailable') || msg.includes('private') || msg.includes('removed');
      res.status(isUnavailable ? 451 : 500).json({ error: msg });
    }
  }
}
