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

import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
const execFileAsync = util.promisify(execFile);

async function getYoutubeStreamUrlNative(videoUrl: string): Promise<string | null> {
  try {
    const isPackaged = !!(process as any).resourcesPath;
    const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    
    // In packaged app: resourcesPath/bin/yt-dlp
    // In dev: node_modules/youtube-dl-exec/bin/yt-dlp
    const binaryPath = isPackaged
      ? path.join((process as any).resourcesPath, 'bin', binaryName)
      : path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', binaryName);

    if (!fs.existsSync(binaryPath)) {
      console.warn(`[Download API] yt-dlp binary not found at ${binaryPath}`);
      return null;
    }

    const { stdout } = await execFileAsync(binaryPath, [
      '--format', 'bestaudio',
      '--get-url',
      '--no-warnings',
      '--no-check-certificates',
      videoUrl
    ]);

    const url = stdout.trim();
    if (url.startsWith('http')) return url;
    return null;
  } catch (e) {
    console.error('[Download API] yt-dlp execFile failed:', e);
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
    console.log(`[Download API] Extracting audio URL for ${videoId} via yt-dlp...`);
    
    // yt-dlp handles all cipher decryption, bot detection, and format selection
    const streamUrl = await getYoutubeStreamUrlNative(videoUrl);

    if (!streamUrl) {
      console.error(`[Download API] yt-dlp returned invalid URL for ${videoId}`);
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
