/**
 * ytmusic-adapter.ts
 * 
 * A RESILIENT, PRODUCTION-GRADE YouTube Music adapter for Pandoos.
 * 
 * WHY THIS EXISTS:
 * ─────────────────
 * YouTube Music is an undocumented private API. Third-party libraries (like ytmusic-api)
 * are wrappers that hard-code the exact JSON key paths returned by YouTube's servers.
 * When YouTube changes those key paths (which they do silently, with no notice), every
 * app depending on the old paths breaks instantly. That's what happened to us: YouTube
 * removed the `playlistItemData.videoId` field and moved the video ID deep inside the
 * `overlay` content object. ytmusic-api was looking at the old location → empty string
 * → all songs became broken across the entire app.
 *
 * HOW WE FIX THIS PERMANENTLY:
 * ──────────────────────────────
 * 1. We use `youtubei.js` as our base library instead. It is lower-level, more actively
 *    maintained, and maps closer to the raw InnerTube API structure.
 *
 * 2. Every field extraction uses LAYERED FALLBACKS. If YouTube changes a path, at least
 *    one of the fallback paths will still work:
 *    - `overlay.content.endpoint.payload.videoId` (primary, most stable)
 *    - `title.runs[0].endpoint.payload.videoId`   (fallback 1)
 *    - `title.endpoint.payload.videoId`            (fallback 2)
 *    - `endpoint.payload.videoId`                  (fallback 3)
 *    - `id`                                        (direct field)
 *    - Regex scan of raw JSON                       (last resort, nuclear option)
 *
 * 3. The adapter is the SINGLE SOURCE OF TRUTH for all YT Music calls in this repo.
 *    All api/*.ts files import from here — not from ytmusic-api directly.
 *    If YouTube breaks again, we fix it in ONE PLACE.
 *
 * SINGLETON PATTERN:
 * ───────────────────
 * The Innertube instance is created once and reused across hot Vercel function invocations
 * (they recycle the same process). This avoids the 1–2s cold-start overhead per request.
 */

import { Innertube } from 'youtubei.js';

// ── Singleton ────────────────────────────────────────────────────────────────

let _yt: Innertube | null = null;

async function getYT(): Promise<Innertube> {
  if (!_yt) {
    _yt = await Innertube.create({
      // Disable the built-in fetch cache — Vercel Edge doesn't persist fs
      cache: undefined,
      generate_session_locally: true,
    });
  }
  return _yt;
}

// ── Shared Types ─────────────────────────────────────────────────────────────

export interface AdapterSong {
  videoId: string;
  title: string;
  artist: string;
  artistId: string | null;
  albumName: string | null;
  albumId: string | null;
  thumbnailUrl: string;
  duration: number; // seconds
}

export interface AdapterArtist {
  artistId: string;
  name: string;
  thumbnailUrl: string;
}

export interface AdapterSearchResult {
  songs: AdapterSong[];
  artists: AdapterArtist[];
}

// ── Core Extraction Helpers ───────────────────────────────────────────────────

/**
 * Extract videoId from a MusicResponsiveListItem using multiple fallback paths.
 * If YouTube changes any one location, the next fallback will catch it.
 */
function extractVideoId(item: any): string {
  // Primary: overlay play button (most reliable — it's always on the play icon)
  const fromOverlay = item?.overlay?.content?.endpoint?.payload?.videoId;
  if (fromOverlay) return fromOverlay;

  // Fallback 1: title run endpoint (the clickable song title)
  const fromTitleRun = item?.title?.runs?.[0]?.endpoint?.payload?.videoId;
  if (fromTitleRun) return fromTitleRun;

  // Fallback 2: title direct endpoint
  const fromTitle = item?.title?.endpoint?.payload?.videoId;
  if (fromTitle) return fromTitle;

  // Fallback 3: item-level endpoint
  const fromEndpoint = item?.endpoint?.payload?.videoId;
  if (fromEndpoint) return fromEndpoint;

  // Fallback 4: item.id (youtubei.js sometimes populates this directly)
  if (typeof item?.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(item.id)) {
    return item.id;
  }

  // Fallback 5: scan the raw JSON for the first 11-char videoId pattern
  // This is the "nuclear option" — works even if YouTube restructures the response completely
  try {
    const raw = JSON.stringify(item);
    const match = raw.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match) return match[1];
  } catch {
    // ignore
  }

  return '';
}

function extractThumbnailUrl(item: any, videoId: string): string {
  // Primary: thumbnail contents from MusicThumbnail
  const fromThumb = item?.thumbnail?.contents;
  if (Array.isArray(fromThumb) && fromThumb.length > 0) {
    // Prefer larger thumbnail (sort by width desc)
    const sorted = [...fromThumb].sort((a, b) => (b.width || 0) - (a.width || 0));
    if (sorted[0]?.url) return sorted[0].url;
  }

  // Fallback: ytimg standard hqdefault (always works for any valid videoId)
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return '';
}

function extractArtistName(item: any): string {
  // flex_columns[1] holds "Artist • Album • Duration" text joined by separators
  const col1 = item?.flex_columns?.[1]?.title;
  if (col1?.runs?.length > 0) {
    // The first run that isn't a separator is the artist
    const artistRun = col1.runs.find((r: any) => r.text && r.text !== ' • ');
    if (artistRun?.text) return artistRun.text;
  }

  // Fallback: first artist in the artists array
  if (Array.isArray(item?.artists) && item.artists.length > 0) {
    return item.artists[0]?.name || '';
  }

  return 'Unknown Artist';
}

function extractArtistId(item: any): string | null {
  // Prefer browseId from the artist's endpoint in the flex column run
  const col1 = item?.flex_columns?.[1]?.title;
  if (col1?.runs) {
    const artistRun = col1.runs.find((r: any) => r.endpoint?.payload?.browseId);
    if (artistRun?.endpoint?.payload?.browseId) return artistRun.endpoint.payload.browseId;
  }

  if (Array.isArray(item?.artists) && item.artists.length > 0) {
    return item.artists[0]?.id || null;
  }

  return null;
}

function extractAlbum(item: any): { name: string | null; id: string | null } {
  // album is a well-structured object in youtubei.js
  if (item?.album?.name) {
    return { name: item.album.name, id: item.album.id || null };
  }

  // Scan flex_columns for the album browseEndpoint
  const col1 = item?.flex_columns?.[1]?.title;
  if (col1?.runs) {
    const albumRun = col1.runs.find((r: any) => r.endpoint?.payload?.browseId?.startsWith('MPREb_'));
    if (albumRun) {
      return { name: albumRun.text, id: albumRun.endpoint.payload.browseId };
    }
  }

  return { name: null, id: null };
}

function mapSong(item: any): AdapterSong | null {
  const videoId = extractVideoId(item);
  if (!videoId) return null; // Hard filter: a song without an ID is useless

  const title =
    item?.title?.text ||
    item?.flex_columns?.[0]?.title?.text ||
    item?.name ||
    'Unknown Title';

  const { name: albumName, id: albumId } = extractAlbum(item);

  return {
    videoId,
    title,
    artist: extractArtistName(item),
    artistId: extractArtistId(item),
    albumName,
    albumId,
    thumbnailUrl: extractThumbnailUrl(item, videoId),
    duration: item?.duration?.seconds || 0,
  };
}

function mapArtist(item: any): AdapterArtist | null {
  const id =
    item?.id ||
    item?.endpoint?.payload?.browseId ||
    item?.navigationEndpoint?.payload?.browseId;

  if (!id) return null;

  const name = item?.name || item?.title?.text || 'Unknown Artist';

  const thumbUrl =
    item?.thumbnail?.contents?.[0]?.url ||
    item?.thumbnail?.contents?.[1]?.url ||
    '';

  return { artistId: id, name, thumbnailUrl: thumbUrl };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search YouTube Music for songs and artists at the same time.
 */
export async function searchYTMusic(query: string): Promise<AdapterSearchResult> {
  const yt = await getYT();

  const [songRes, artistRes] = await Promise.allSettled([
    yt.music.search(query, { type: 'song' }),
    yt.music.search(query, { type: 'artist' }),
  ]);

  const songs: AdapterSong[] = [];
  if (songRes.status === 'fulfilled') {
    const shelf = songRes.value?.contents?.[0];
    const items = shelf?.contents || [];
    for (const item of items) {
      const song = mapSong(item);
      if (song) songs.push(song);
    }
  }

  const artists: AdapterArtist[] = [];
  if (artistRes.status === 'fulfilled') {
    const shelf = artistRes.value?.contents?.[0];
    const items = shelf?.contents || [];
    for (const item of items) {
      const artist = mapArtist(item);
      if (artist) artists.push(artist);
    }
  }

  return { songs: songs.slice(0, 20), artists: artists.slice(0, 8) };
}

/**
 * Search for songs only (used by trending, oracle etc.)
 */
export async function searchSongs(query: string, limit = 15): Promise<AdapterSong[]> {
  const yt = await getYT();
  const res = await yt.music.search(query, { type: 'song' });
  const shelf = res?.contents?.[0];
  const items = shelf?.contents || [];

  const songs: AdapterSong[] = [];
  for (const item of items) {
    const song = mapSong(item);
    if (song) songs.push(song);
    if (songs.length >= limit) break;
  }
  return songs;
}

/**
 * Get related/radio tracks for a videoId (used by /api/radio).
 */
export async function getRelatedSongs(videoId: string, limit = 30): Promise<AdapterSong[]> {
  const yt = await getYT();

  try {
    // First, get a watch playlist seeded by this videoId
    const watchRes = await yt.music.getRelated(videoId);
    const items = watchRes?.contents?.[0]?.contents || watchRes?.contents || [];

    const songs: AdapterSong[] = [];
    for (const item of items) {
      if (item.type !== 'PlaylistPanelVideo' && item.type !== 'MusicResponsiveListItem') continue;
      // PlaylistPanelVideo has a direct video_id field
      const vid = item?.video_id || item?.videoId || extractVideoId(item);
      if (!vid) continue;

      songs.push({
        videoId: vid,
        title: item?.title?.text || item?.title || 'Unknown',
        artist: item?.short_byline_text?.runs?.[0]?.text || extractArtistName(item) || 'Unknown Artist',
        artistId: item?.short_byline_text?.runs?.[0]?.endpoint?.payload?.browseId || extractArtistId(item) || null,
        albumName: item?.album?.name || null,
        albumId: item?.album?.id || extractAlbum(item).id,
        thumbnailUrl: extractThumbnailUrl(item, vid),
        duration: item?.length_seconds || item?.duration?.seconds || 0,
      });
      if (songs.length >= limit) break;
    }

    // If we got nothing from getRelated, fall back to search
    if (songs.length === 0) {
      return searchSongs(`${videoId} related`, limit);
    }
    return songs;
  } catch {
    // Graceful fallback: search by videoId as keyword
    return searchSongs(videoId, limit);
  }
}

/**
 * Fetch artist details page (used by /api/artist).
 */
export async function getArtistDetails(browseId: string): Promise<any> {
  const yt = await getYT();
  const res = await yt.music.getArtist(browseId);

  const name = res?.header?.title?.text || res?.header?.name || '';
  const thumbnailUrl =
    res?.header?.thumbnail?.contents?.[0]?.url ||
    res?.header?.thumbnail?.contents?.[1]?.url ||
    '';

  // Top songs from MusicShelf sections
  const topSongsSection = res?.sections?.find(
    (s: any) => s.type === 'MusicShelf' || s.type === 'MusicCarouselShelf'
  );
  const topSongs: AdapterSong[] = [];
  for (const item of topSongsSection?.contents || []) {
    const song = mapSong(item);
    if (song) topSongs.push(song);
  }

  return { name, thumbnailUrl, topSongs, raw: res };
}

/**
 * Fetch album details (used by /api/album).
 */
export async function getAlbumDetails(browseId: string): Promise<any> {
  const yt = await getYT();
  const res = await yt.music.getAlbum(browseId);

  // Map album tracks — they use PlaylistPanelVideo or MusicResponsiveListItem
  const tracks: AdapterSong[] = [];
  for (const item of res?.contents || []) {
    const vid =
      item?.video_id ||
      item?.videoId ||
      item?.endpoint?.payload?.videoId ||
      extractVideoId(item);
    if (!vid) continue;
    tracks.push({
      videoId: vid,
      title: item?.title?.text || item?.title || '',
      artist: item?.short_byline_text?.runs?.[0]?.text || extractArtistName(item) || '',
      artistId: null,
      albumName: res?.header?.title?.text || null,
      albumId: browseId,
      thumbnailUrl: extractThumbnailUrl(item, vid),
      duration: item?.duration?.seconds || item?.length_seconds || 0,
    });
  }

  return { tracks, raw: res };
}
