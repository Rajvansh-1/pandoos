import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

// No edge runtime so ytmusic-api works smoothly
export default async function handler(req: any, res: any) {
  // Safely parse URL whether it's absolute (Edge) or relative (Node/Vite)
  const urlString = req.url.startsWith('http') ? req.url : `http://localhost${req.url}`;
  const { searchParams } = new URL(urlString);
  
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return json(res, { error: 'Missing videoId' }, 400);
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    
    const lyrics = await ytmusic.getLyrics(videoId);
    if (!lyrics) {
      return json(res, { plainLyrics: '', syncedLyrics: null }, 200);
    }
    
    return json(res, { plainLyrics: lyrics, syncedLyrics: null }, 200, {
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    });
  } catch (err: unknown) {
    console.error('YTM Lyrics error:', err);
    return json(res, { plainLyrics: '', syncedLyrics: null }, 200);
  }
}

function json(
  res: any,
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
) {
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    // Express / Vercel Node Response
    for (const [key, val] of Object.entries(extraHeaders)) {
      res.setHeader(key, val);
    }
    return res.status(status).json(body);
  }
  
  // Edge / Web Response fallback
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}
