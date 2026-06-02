import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getArtistDetails } from './ytmusic-adapter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const browseId = (req.query.id || req.query.browseId) as string;

  if (!browseId) {
    return res.status(400).json({ error: 'Query parameter "id" is required' });
  }

  const cacheKey = `pandoos:ytm_artist_v4:${browseId}`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // ── Redis cache read ──────────────────────────────────────────────────────
  if (upstashUrl && upstashToken) {
    try {
      const cacheRes = await fetch(`${upstashUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.result) {
          const item = typeof cacheData.result === 'string'
            ? JSON.parse(cacheData.result)
            : cacheData.result;
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
          return res.status(200).json({ artist: item, cached: true });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // ── Artist fetch ──────────────────────────────────────────────────────────
  try {
    const { name, thumbnailUrl, topSongs, raw } = await getArtistDetails(browseId);

    const artistData = {
      name,
      thumbnailUrl,
      topSongs: topSongs.map(s => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        albumArt: s.thumbnailUrl,
        duration: s.duration,
      })),
      // Pass through any additional raw fields consumers may need
      _raw: raw,
    };

    // ── Redis cache write ─────────────────────────────────────────────────
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
    console.error('[Artist API] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
