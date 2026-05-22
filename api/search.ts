export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Redis Cache Key
  const cacheKey = `pandoos:search:${query.toLowerCase().trim()}`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const ytApiKey = process.env.YOUTUBE_API_KEY;

  if (!ytApiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: missing YT API key' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // 1. Try Cache First
  if (upstashUrl && upstashToken) {
    try {
      const cacheRes = await fetch(`${upstashUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.result) {
          // Upstash returns JSON strings for stored objects
          const items = typeof cacheData.result === 'string' ? JSON.parse(cacheData.result) : cacheData.result;
          return new Response(JSON.stringify({ items, cached: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    } catch (e) {
      console.error('Redis cache read failed:', e);
    }
  }

  // 2. Cache Miss -> Fetch from YouTube
  try {
    const ytUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    ytUrl.searchParams.set('part', 'snippet');
    ytUrl.searchParams.set('type', 'video');
    ytUrl.searchParams.set('videoCategoryId', '10'); // Music
    ytUrl.searchParams.set('maxResults', '15');
    ytUrl.searchParams.set('key', ytApiKey);

    if (query === 'TSERIES_LATEST') {
      ytUrl.searchParams.set('channelId', 'UCq-Fj5jknLsUf-MWSy4_brA');
      ytUrl.searchParams.set('order', 'date');
    } else {
      ytUrl.searchParams.set('q', query);
    }

    let ytRes = await fetch(ytUrl.toString());
    
    // Fallback logic for secondary key if primary fails with 403 (Quota Exceeded)
    if (!ytRes.ok && ytRes.status === 403 && process.env.YOUTUBE_API_KEY_2) {
      console.warn('Primary API Key failed with 403. Trying backup key...');
      ytUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY_2);
      ytRes = await fetch(ytUrl.toString());
    }

    if (!ytRes.ok) {
      throw new Error(`YouTube API returned ${ytRes.status}`);
    }

    const data = await ytRes.json();

    // 3. Save to Cache (Async, fire and forget)
    if (upstashUrl && upstashToken && data.items) {
      // 24 hours = 86400 seconds
      fetch(`${upstashUrl}/set/${encodeURIComponent(cacheKey)}?ex=86400`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.items),
      }).catch((e) => console.error('Redis cache write failed:', e));
    }

    return new Response(JSON.stringify({ items: data.items, cached: false }), {
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
