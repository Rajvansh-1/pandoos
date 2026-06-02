import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchYTMusic } from './ytmusic-adapter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.q || req.query.query) as string;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const cacheKey = `pandoos:ytm_search_v5:${query.toLowerCase().trim()}`;
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
          const resultObj = typeof cacheData.result === 'string'
            ? JSON.parse(cacheData.result)
            : cacheData.result;
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
          return res.status(200).json({ ...resultObj, cached: true });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  try {
    const { songs, artists } = await searchYTMusic(query);

    const mappedSongs = songs.map(song => ({
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

    const mappedArtists = artists.map(artist => ({
      artistId: artist.artistId,
      name: artist.name,
      thumbnails: [{ url: artist.thumbnailUrl }],
    }));

    const responseObj = { items: mappedSongs, artists: mappedArtists };

    // ── Redis cache write ─────────────────────────────────────────────────
    if (upstashUrl && upstashToken && (mappedSongs.length > 0 || mappedArtists.length > 0)) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(responseObj),
      }).catch(e => console.error('Redis cache write failed:', e));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json({ ...responseObj, cached: false });
  } catch (error: any) {
    console.error('[Search API] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
