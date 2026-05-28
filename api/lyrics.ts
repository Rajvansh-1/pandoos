import type { VercelRequest, VercelResponse } from '@vercel/node';
import YTMusic from 'ytmusic-api';
import { setCors } from './_cors';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  const title = (req.query.track_name || req.query.title) as string | undefined;
  const artist = (req.query.artist_name || req.query.artist) as string | undefined;
  const videoId = req.query.videoId as string | undefined;

  if (!title && !videoId) {
    return res.status(400).json({ error: 'Missing track_name or videoId' });
  }

  try {
    const fetchLrclib = async () => {
      const lrcUrl = new URL('https://lrclib.net/api/get');
      if (title) lrcUrl.searchParams.set('track_name', title);
      if (artist) lrcUrl.searchParams.set('artist_name', artist);

      const resp = await fetch(lrcUrl.toString(), {
        headers: { 'User-Agent': 'PandoosMusic/2.0' },
      });

      if (!resp.ok) throw new Error(`LRCLIB error ${resp.status}`);

      const data = await resp.json() as any;
      if (!data.plainLyrics && !data.syncedLyrics) throw new Error('No lyrics found on LRCLIB');
      return { plainLyrics: data.plainLyrics ?? '', syncedLyrics: data.syncedLyrics ?? null };
    };

    const fetchYtm = async () => {
      if (!videoId) throw new Error('No videoId for YTM lyrics');

      if (!initialized) {
        await ytmusic.initialize();
        initialized = true;
      }

      const lyrics = await ytmusic.getLyrics(videoId);
      if (!lyrics) throw new Error('No lyrics found on YTM');

      return { plainLyrics: lyrics, syncedLyrics: null };
    };

    const promises: Promise<any>[] = [];
    if (title || artist) promises.push(fetchLrclib());
    if (videoId) promises.push(fetchYtm());

    const result = await Promise.any(promises);

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (err: unknown) {
    return res.status(200).json({ plainLyrics: '', syncedLyrics: null });
  }
}
