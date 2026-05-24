import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler() {
  const cacheKey = `pandoos:ytm_trending_v2`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Try Cache First
  if (upstashUrl && upstashToken) {
    try {
      const cacheRes = await fetch(`${upstashUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.result) {
          const items = typeof cacheData.result === 'string' ? JSON.parse(cacheData.result) : cacheData.result;
          return new Response(JSON.stringify({ items, cached: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    } catch (e) {
      console.error('Redis read failed:', e);
    }
  }

  // 2. Fetch from InnerTube API
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    // Since YTM doesn't have a direct "get trending tracks" method without scraping a specific chart playlist,
    // we search for a generic trending query. In a production system, you might fetch a specific Top 50 Playlist ID.
    const results = await ytmusic.searchSongs('Global Top 50');

    const items = results.map(song => ({
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

    // 3. Cache it
    if (upstashUrl && upstashToken && items.length > 0) {
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=43200`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
      }).catch((e) => console.error('Redis write failed:', e));
    }

    return new Response(JSON.stringify({ items, cached: false }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=43200, stale-while-revalidate=21600',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
