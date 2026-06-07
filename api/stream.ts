import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytdl from '@distube/ytdl-core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers for native capacitor
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId parameter' });

  try {
    console.log(`[Stream API] Fetching info for ${videoId}...`);
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    
    if (!format || !format.url) {
      throw new Error('No audio format found');
    }
    
    console.log(`[Stream API] Successfully got URL for ${videoId}`);
    return res.status(200).json({ url: format.url });
  } catch (error: any) {
    console.error(`[Stream API] Error for ${videoId}:`, error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
