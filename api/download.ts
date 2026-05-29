import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytdlCore from '@distube/ytdl-core';

// Handle potential ESM interop issues where CJS default export is nested under .default
const ytdl = (ytdlCore as any).default || ytdlCore;

export const config = {
  api: {
    responseLimit: '15mb',
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
    // Do NOT use createAgent() — it requires valid YouTube cookies and fails without them,
    // causing 500 errors. A plain unauthenticated request works fine for most content.
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          // Pretend to be a real browser to avoid bot detection
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    // Prefer opus (webm) for lowest latency, fall back to m4a
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!audioFormat) {
      return res.status(404).json({ error: 'No audio format found' });
    }

    // Set correct MIME type based on actual format container
    const mimeType = audioFormat.mimeType?.split(';')[0] || 'audio/webm';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${videoId}.webm"`);
    // Allow range requests for seeking
    res.setHeader('Accept-Ranges', 'bytes');
    // Cache for 1 hour to avoid repeated YT requests
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const stream = ytdl.downloadFromInfo(info, { format: audioFormat });

    stream.on('error', (err: any) => {
      console.error('[Download API] YTDL Stream Error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio: ' + err.message });
      } else {
        res.end();
      }
    });

    stream.pipe(res);

  } catch (error: any) {
    console.error('[Download API] Error for videoId', videoId, ':', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
}
