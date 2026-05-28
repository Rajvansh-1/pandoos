import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytmusicApi from 'ytmusic-api';

// Handle potential ESM interop issues where CJS default export is nested under .default
const YTMusic = (ytmusicApi as any).default || ytmusicApi;
const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = (req.query.videoId || req.query.id) as string;

  if (!videoId) {
    return res.status(400).json({ error: 'Query parameter "videoId" is required' });
  }

  const cacheKey = `pandoos:ytm_radio_v3:${videoId}`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const cacheRes = await fetch(`${upstashUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.result) {
          const items = typeof cacheData.result === 'string' ? JSON.parse(cacheData.result) : cacheData.result;
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
          return res.status(200).json({ items, cached: true });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    const suggestions = await ytmusic.getUpNext(videoId);

    const mappedItems = suggestions.map(song => ({
      id: { videoId: song.videoId },
      snippet: {
        title: song.title,
        channelTitle: song.artists?.[0]?.name || 'Unknown Artist',
        thumbnails: {
          high: { url: song.thumbnailUrl || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` }
        },
        publishedAt: new Date().toISOString(),
        artistId: song.artists?.[0]?.artistId || null,
        albumId: song.album?.albumId || null,
      }
    }));

    if (upstashUrl && upstashToken && mappedItems.length > 0) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedItems),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ items: mappedItems, cached: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.stack || error.message || 'Internal Server Error' });
  }
}
