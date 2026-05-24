import type { VercelRequest, VercelResponse } from '@vercel/node';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const browseId = (req.query.id || req.query.browseId) as string;

  if (!browseId) {
    return res.status(400).json({ error: 'Query parameter "id" is required' });
  }

  const cacheKey = `pandoos:ytm_artist_v3:${browseId}`;
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
          const item = typeof cacheData.result === 'string' ? JSON.parse(cacheData.result) : cacheData.result;
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
          return res.status(200).json({ artist: item, cached: true });
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

    const artistData = await ytmusic.getArtist(browseId);

    if (upstashUrl && upstashToken && artistData) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(artistData),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ artist: artistData, cached: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
