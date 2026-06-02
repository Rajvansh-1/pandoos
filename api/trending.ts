import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchSongs } from './ytmusic-adapter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cacheKey = `pandoos:ytm_trending_v4`;
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
          const items = typeof cacheData.result === 'string'
            ? JSON.parse(cacheData.result)
            : cacheData.result;
          res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=21600');
          return res.status(200).json({ items, cached: true });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // ── Trending fetch ────────────────────────────────────────────────────────
  try {
    const songs = await searchSongs('latest trending songs', 15);

    const mappedItems = songs.map(song => ({
      id: { videoId: song.videoId },
      snippet: {
        title: song.title,
        channelTitle: song.artist,
        thumbnails: {
          high: { url: song.thumbnailUrl }
        },
        publishedAt: new Date().toISOString(),
        artistId: song.artistId,
        albumId: song.albumId,
      }
    }));

    // ── Redis cache write ─────────────────────────────────────────────────
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
    console.error('[Trending API] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
