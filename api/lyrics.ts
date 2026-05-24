import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

// No edge runtime so ytmusic-api works smoothly
export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('track_name') ?? searchParams.get('title');
  const artist = searchParams.get('artist_name') ?? searchParams.get('artist');
  const videoId = searchParams.get('videoId');

  if (!title && !videoId) {
    return json({ error: 'Missing track_name or videoId' }, 400);
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    const fetchLrclib = async () => {
      const lrcUrl = new URL('https://lrclib.net/api/get');
      if (title) lrcUrl.searchParams.set('track_name', title);
      if (artist) lrcUrl.searchParams.set('artist_name', artist);

      const res = await fetch(lrcUrl.toString(), {
        headers: { 'User-Agent': 'PandoosMusic/2.0' },
      });

      if (!res.ok) {
        throw new Error(`LRCLIB error ${res.status}`);
      }

      const data = await res.json() as any;
      if (!data.plainLyrics && !data.syncedLyrics) throw new Error('No lyrics found on LRCLIB');
      return { plainLyrics: data.plainLyrics ?? '', syncedLyrics: data.syncedLyrics ?? null };
    };

    const fetchYtm = async () => {
      if (!videoId) throw new Error('No videoId for YTM lyrics');
      const lyrics = await ytmusic.getLyrics(videoId);
      if (!lyrics) throw new Error('No lyrics found on YTM');
      
      // YTM typically returns a block of plain text, occasionally synced if supported
      return { plainLyrics: lyrics, syncedLyrics: null };
    };

    // Race them: whichever returns valid lyrics first wins
    const promises = [fetchLrclib()];
    if (videoId) promises.push(fetchYtm());

    const result = await Promise.any(promises);

    return json(result, 200, {
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    });
  } catch (err: unknown) {
    // If all promises reject, Promise.any throws an AggregateError
    // In that case, we just return empty lyrics rather than crashing the player
    return json({ plainLyrics: '', syncedLyrics: null }, 200);
  }
}

function json(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}
