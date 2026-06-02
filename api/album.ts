import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAlbumDetails } from './ytmusic-adapter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const browseId = (req.query.id || req.query.browseId) as string;

  if (!browseId) {
    return res.status(400).json({ error: 'Query parameter "id" is required' });
  }

  const cacheKey = `pandoos:ytm_album_v4:${browseId}`;
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
          return res.status(200).json({ album: item, cached: true });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // ── Album fetch ───────────────────────────────────────────────────────────
  try {
    const { tracks, raw } = await getAlbumDetails(browseId);

    const albumData = {
      tracks: tracks.map(t => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artist,
        albumArt: t.thumbnailUrl,
        duration: t.duration,
        albumId: browseId,
      })),
      _raw: raw,
    };

    // ── Redis cache write ─────────────────────────────────────────────────
    if (upstashUrl && upstashToken && albumData) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ album: albumData, cached: false });
  } catch (error: any) {
    console.error('[Album API] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
