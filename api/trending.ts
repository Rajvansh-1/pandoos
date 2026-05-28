import type { VercelRequest, VercelResponse } from '@vercel/node';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cacheKey = `pandoos:ytm_trending_v3`;
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
          res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=21600');
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

    const results = await ytmusic.searchSongs('latest trending songs');

    const mappedItems = results.map(song => ({
      id: { videoId: song.videoId },
      snippet: {
        title: song.name,
        channelTitle: song.artist?.name || 'Unknown Artist',
        thumbnails: {
          high: { url: song.thumbnails?.[1]?.url || song.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` }
        },
        publishedAt: new Date().toISOString(),
        artistId: song.artist?.artistId || song.artist?.browseId || null,
        albumId: song.album?.albumId || song.album?.browseId || null,
      }
    })).slice(0, 15);

    if (upstashUrl && upstashToken && mappedItems.length > 0) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=43200`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedItems),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=21600');
    return res.status(200).json({ items: mappedItems, cached: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
