/**
 * api/lyrics.ts — Edge function proxy for LRCLIB /api/get
 *
 * Proxying through Vercel edge avoids CORS and adds a 24-hour CDN cache layer.
 */
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('track_name') ?? searchParams.get('title');
  const artist = searchParams.get('artist_name') ?? searchParams.get('artist');

  if (!title) {
    return json({ error: 'Missing track_name' }, 400);
  }

  try {
    const lrcUrl = new URL('https://lrclib.net/api/get');
    if (title) lrcUrl.searchParams.set('track_name', title);
    if (artist) lrcUrl.searchParams.set('artist_name', artist);

    const res = await fetch(lrcUrl.toString(), {
      headers: { 'User-Agent': 'PandoosMusic/1.0 (https://github.com/Rajvansh-1/pandoos)' },
    });

    if (!res.ok) {
      if (res.status === 404) return json({ plainLyrics: '', syncedLyrics: null }, 200);
      throw new Error(`LRCLIB error ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    return json(
      { plainLyrics: data['plainLyrics'] ?? '', syncedLyrics: data['syncedLyrics'] ?? null },
      200,
      { 'cache-control': 'public, s-maxage=86400, stale-while-revalidate=3600' }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
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
