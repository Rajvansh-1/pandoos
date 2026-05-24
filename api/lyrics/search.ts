/**
 * api/lyrics/search.ts — Edge function proxy for LRCLIB /api/search
 */
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return json({ error: 'Missing q' }, 400);
  }

  try {
    const lrcUrl = new URL('https://lrclib.net/api/search');
    lrcUrl.searchParams.set('q', q);

    const res = await fetch(lrcUrl.toString(), {
      headers: { 'User-Agent': 'PandoosMusic/1.0 (https://github.com/Rajvansh-1/pandoos)' },
    });

    if (!res.ok) {
      if (res.status === 404) return json([], 200);
      throw new Error(`LRCLIB error ${res.status}`);
    }

    const data = await res.json();
    return json(data, 200, {
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=600',
    });
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
