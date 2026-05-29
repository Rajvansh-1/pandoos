import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytdlCore from '@distube/ytdl-core';

// Handle potential ESM interop issues
const ytdl = (ytdlCore as any).default || ytdlCore;

// ─────────────────────────────────────────────────────────────────────────────
// Audio proxy endpoint
//
// IMPORTANT: This is the FALLBACK path — only called when the YouTube IFrame
// player gives error 150/101 (embedding disabled by the video owner).
// The primary playback path is the YT IFrame player directly.
//
// ytdl-core may fail for some videos when YouTube rotates their player script.
// When it fails, the audio engine automatically skips to the next track — 
// the user won't be stuck on a broken song.
// ─────────────────────────────────────────────────────────────────────────────

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

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Get video info without createAgent (which requires YT cookies)
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
    });

    // Find best audio-only format with a playable URL
    const formats = info.formats.filter(
      (f: any) => f.hasAudio && !f.hasVideo && f.url
    );

    if (formats.length === 0) {
      console.error(`[Download API] No playable audio formats for ${videoId} — ytdl decipher may be broken`);
      // Return 451 (unavailable for legal/technical reasons) so the audio engine
      // knows this is a permanent failure and skips cleanly, NOT a transient error.
      return res.status(451).json({ 
        error: 'No playable audio format found. This may be due to YouTube embedding restrictions.',
        videoId,
      });
    }

    // Sort by bitrate descending, prefer opus/webm
    formats.sort((a: any, b: any) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    const preferOpus = formats.find((f: any) => f.mimeType?.includes('opus')) || formats[0];

    const streamUrl = preferOpus.url;
    const mimeType = preferOpus.mimeType?.split(';')[0] || 'audio/webm';
    
    console.log(`[Download API] Streaming ${videoId} | format: ${mimeType} | bitrate: ${preferOpus.audioBitrate}kbps`);

    // Proxy the stream (avoids CORS issues in Electron renderer)
    const rangeHeader = req.headers['range'] as string;
    const streamRes = await fetch(streamUrl, {
      headers: {
        ...(rangeHeader ? { 'Range': rangeHeader } : {}),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    });

    if (!streamRes.ok && streamRes.status !== 206) {
      console.error(`[Download API] Stream fetch returned ${streamRes.status} for ${videoId}`);
      return res.status(streamRes.status).json({ error: `YouTube stream returned ${streamRes.status}` });
    }

    res.writeHead(streamRes.status, {
      'Content-Type': mimeType,
      'Content-Length': streamRes.headers.get('content-length') || '',
      'Content-Range': streamRes.headers.get('content-range') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });

    const reader = streamRes.body?.getReader();
    if (!reader) {
      res.end();
      return;
    }

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
    console.error(`[Download API] Error for ${videoId}:`, msg);
    if (!res.headersSent) {
      // Use 451 for "no playable formats" so audio engine skips cleanly
      const statusCode = msg.includes('playable') ? 451 : 500;
      res.status(statusCode).json({ error: msg });
    }
  }
}
