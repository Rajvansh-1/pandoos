import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

let youtubeDlFn: any = null;

async function getYoutubeDl() {
  if (youtubeDlFn) return youtubeDlFn;
  try {
    const { create } = (await import('youtube-dl-exec')) as any;
    
    // In packaged app, process.resourcesPath is available and bin/ is in extraResources
    const resourcesPath = (process as any).resourcesPath;
    let binaryPath;
    
    if (resourcesPath) {
      binaryPath = path.join(resourcesPath, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : (process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp'));
    } else {
      // In dev mode (vite server)
      binaryPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : (process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp'));
    }

    if (fs.existsSync(binaryPath)) {
      youtubeDlFn = create(binaryPath);
    } else {
      // Fallback to auto-detect if the binary isn't strictly there
      youtubeDlFn = (await import('youtube-dl-exec') as any).default;
    }

    return youtubeDlFn;
  } catch (e) {
    console.error('[Download API] Failed to load youtube-dl-exec:', e);
    return null;
  }
}

export const config = {
  api: {
    responseLimit: '50mb', // Audio files might be larger
  },
};

const urlCache = new Map<string, { url: string, expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing videoId parameter' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let streamUrl = '';

  try {
    // Check in-memory cache first (valid for 4 hours)
    const cached = urlCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      streamUrl = cached.url;
      console.log(`[Download API] Using cached stream URL for ${videoId}`);
    } else {
      const ydl = await getYoutubeDl();

      if (!ydl) {
        return res.status(503).json({ error: 'yt-dlp not available in this environment' });
      }

      console.log(`[Download API] Extracting audio URL for ${videoId} via yt-dlp...`);

      const result = await ydl(videoUrl, {
        format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        getUrl: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        noCacheDir: true, // Crucial: prevents disk cache lockups after long usage
        addHeader: [
          'referer:https://www.youtube.com/',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ],
      });

      streamUrl = (typeof result === 'string' ? result : result?.url || '').trim();

      if (!streamUrl || !streamUrl.startsWith('http')) {
        console.error(`[Download API] yt-dlp returned invalid URL for ${videoId}:`, streamUrl?.substring(0, 100));
        return res.status(451).json({ error: 'Could not extract audio URL — video may be unavailable' });
      }

      // Cache the URL for 4 hours (YouTube stream URLs expire after ~6 hours)
      urlCache.set(videoId, { url: streamUrl, expiresAt: Date.now() + 4 * 60 * 60 * 1000 });
    }

    console.log(`[Download API] Got stream URL for ${videoId} — proxying...`);

    const abortController = new AbortController();

    // Read the Range header from the incoming request for proper seeking/streaming support.
    // BUG FIX: rangeHeader was used below but never declared, causing a ReferenceError
    // that the outer catch block turned into a 500 on every proxy fallback request.
    const rangeHeader = (req.headers as any)?.['range'] ?? (req.headers as any)?.['Range'] ?? '';

    // If the user skips a song, the browser aborts the request. We MUST cancel the fetch!
    req.on('close', () => {
      console.log(`[Download API] Client disconnected for ${videoId}, aborting fetch...`);
      abortController.abort();
    });

    const streamRes = await fetch(streamUrl, {
      signal: abortController.signal,
      headers: {
        ...(rangeHeader ? { 'Range': rangeHeader } : {}),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
      },
    });

    if (!streamRes.ok && streamRes.status !== 206) {
      console.error(`[Download API] Stream fetch returned ${streamRes.status} for ${videoId}`);
      return res.status(streamRes.status).json({ error: `Stream error: ${streamRes.status}` });
    }

    const contentType = streamRes.headers.get('content-type') || 'audio/webm';
    
    res.writeHead(streamRes.status, {
      'Content-Type': contentType,
      'Content-Length': streamRes.headers.get('content-length') || '',
      'Content-Range': streamRes.headers.get('content-range') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });

    const reader = streamRes.body?.getReader();
    if (!reader) { res.end(); return; }

    try {
      while (true) {
        if (req.destroyed || abortController.signal.aborted) {
          await reader.cancel();
          break;
        }
        
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        
        if (value) {
          const canContinue = res.write(Buffer.from(value));
          if (!canContinue) {
            await new Promise(resolve => (res as any).once('drain', resolve));
          }
        }
      }
    } catch (streamErr: any) {
      if (streamErr.name === 'AbortError') {
        console.log(`[Download API] Stream successfully aborted for ${videoId}`);
      } else {
        throw streamErr; // Re-throw to be caught by outer catch block
      }
    }

  } catch (error: any) {
    const msg = error.message || 'Internal Server Error';
    console.error(`[Download API] yt-dlp error for ${videoId}:`, msg.substring(0, 200));
    if (!res.headersSent) {
      const isUnavailable = msg.toLowerCase().includes('unavailable') || msg.toLowerCase().includes('private') || msg.toLowerCase().includes('sign in');
      res.status(isUnavailable ? 451 : 500).json({ error: msg });
    }
  }
}

