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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.mp3"`);
    
    // Create the stream
    const stream = ytdl.downloadFromInfo(info, { format: audioFormat });
    
    stream.on('error', (err: any) => {
      console.error('[Download API] YTDL Stream Error:', err.message || err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Failed to stream audio' });
      } else {
        res.end(); // Ensure response ends cleanly if headers were sent
      }
    });

    // Pipe directly, Node handles chunking automatically
    stream.pipe(res);

  } catch (error: any) {
    console.error('[Download API] Catch Error:', error.message || error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
}

