import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytdlCore from '@distube/ytdl-core';

// Handle potential ESM interop issues where CJS default export is nested under .default
const ytdl = (ytdlCore as any).default || ytdlCore;

export const config = {
  api: {
    responseLimit: '15mb', // Audio files shouldn't exceed 15mb for a 5min song
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
    const agent = ytdl.createAgent();
    const info = await ytdl.getInfo(url, { agent });
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    if (!audioFormat) {
      return res.status(404).json({ error: 'No audio format found' });
    }

    res.setHeader('Content-Type', 'audio/mpeg'); // Most are webm/m4a but we stream as raw audio
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);
    // Remove the content-length so it uses chunked transfer encoding, preventing Vercel from blocking large files
    
    // Pipe the stream directly to the response
    const stream = ytdl.downloadFromInfo(info, { format: audioFormat });
    
    stream.on('error', (err) => {
      console.error('YTDL Stream Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);

  } catch (error: any) {
    console.error('Download API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.stack || error.message || 'Internal Server Error' });
    }
  }
}

