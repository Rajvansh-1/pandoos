import type { VercelRequest, VercelResponse } from '@vercel/node';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.q || req.query.query) as string;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const cacheKey = `pandoos:ytm_search_v3:${query.toLowerCase().trim()}`;
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

    const results = await ytmusic.searchSongs(query);

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
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedItems),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ items: mappedItems, cached: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
