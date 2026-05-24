import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const browseId = searchParams.get('id');

  if (!browseId) {
    return new Response(JSON.stringify({ error: 'Query parameter "id" is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Redis Cache Key
  const cacheKey = `pandoos:ytm_artist_v2:${browseId}`;
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
          const item = typeof cacheData.result === 'string' ? JSON.parse(cacheData.result) : cacheData.result;
          return new Response(JSON.stringify({ artist: item, cached: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // 2. Cache Miss -> Fetch from InnerTube API
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    const artistData = await ytmusic.getArtist(browseId);

    // 3. Save to Cache (Async, fire and forget)
    if (upstashUrl && upstashToken && artistData) {
      // 24 hours = 86400 seconds
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(artistData),
      }).catch((e) => console.error('Redis cache write failed:', e));
    }

    return new Response(JSON.stringify({ artist: artistData, cached: false }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
