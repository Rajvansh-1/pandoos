import { getApiUrl } from '@/utils/api';
import { getCachedLyrics, setCachedLyrics, type LyricsProviderMap } from './lyricsCache';
/**
 * lyrics.ts — Production-grade lyrics fetching service.
 *
 * Strategy (waterfall — stops on first hit):
 *  1. LRCLIB: exact title + artist (synced preferred, then plain)
 *  2. LRCLIB: cleaned title + artist (strip feat., parens, etc.)
 *  3. LRCLIB: title only (broad search via search endpoint)
 *  4. Resolve to empty (show "no lyrics" state)
 *
 * All requests are made through the edge /api/lyrics proxy in production
 * and directly against lrclib.net in development to avoid CORS issues.
 */

export interface LyricsLine {
  /** Timestamp in milliseconds */
  time: number;
  /** The lyric text for this line */
  text: string;
}

export interface LyricsResult {
  /** Synced (timestamped) lines. Null if not available. */
  synced: LyricsLine[] | null;
  /** Plain (unsynced) lyrics. Empty string if not available. */
  plain: string;
  /** Whether the result was from an exact or approximate match */
  matchType: 'exact' | 'fuzzy' | 'none';
}

/** Parse an LRC-format string into timestamped lines. */
function parseLRC(lrc: string): LyricsLine[] {
  if (!lrc?.trim()) return [];

  const lines: LyricsLine[] = [];
  // Handle both [mm:ss.xx] and [mm:ss.xxx] formats
  const regex = /\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(lrc)) !== null) {
    const mins = parseInt(match[1] ?? '0', 10);
    const secs = parseInt(match[2] ?? '0', 10);
    // Normalize centiseconds (2 digits) or milliseconds (3 digits)
    const msRaw = match[3] ?? '0';
    const ms = msRaw.length === 2
      ? parseInt(msRaw, 10) * 10
      : parseInt(msRaw.padEnd(3, '0'), 10);
    const text = (match[4] ?? '').trim();

    // Include even empty lines — they represent instrumental/pause gaps
    lines.push({ time: (mins * 60 + secs) * 1000 + ms, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

/** Aggressive title cleaner for better fuzzy matching */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*/g, ' ')  // Remove (feat. ...) (Official Video) etc.
    .replace(/\s*\[.*?\]\s*/g, ' ')  // Remove [Official Audio] etc.
    .replace(/ - .*$/, '')            // Remove " - Artist Name" suffix
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clean artist name for better matching */
function cleanArtist(artist: string): string {
  return artist
    .replace(/ - Topic$/i, '')         // YouTube "Artist - Topic" channels
    .replace(/,.*$/, '')               // Take only first credited artist
    .replace(/\s*feat\..*$/i, '')      // Strip feat. credits
    .replace(/\s*ft\..*$/i, '')
    .trim();
}

/** Build the correct API URL for dev vs. production */
function buildUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  // LRCLIB supports CORS, so we can always fetch directly from the client.
  // This bypasses serverless function cold starts and proxy overhead in production,
  // making it "lightning fast" and exactly like Spotify/Apple Music.
  return `https://lrclib.net/api/get?${qs}`;
}

/** Build the search API URL */
function buildSearchUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  // Call LRCLIB directly to avoid proxy overhead
  return `https://lrclib.net/api/search?${qs}`;
}

interface LRCLIBItem {
  plainLyrics?: string;
  syncedLyrics?: string;
  trackName?: string;
  artistName?: string;
}

async function fetchFromLRCLIB(params: Record<string, string>): Promise<LRCLIBItem | null> {
  try {
    const headers: Record<string, string> = {
      // LRCLIB requests a user agent, but browser 'fetch' doesn't allow setting User-Agent directly.
      // We skip setting it to prevent preflight errors in some older browsers.
    };
    const res = await fetch(buildUrl(params), { headers });
    if (!res.ok) return null;
    const data = await res.json() as LRCLIBItem;
    // LRCLIB returns 404-shaped 200 sometimes (empty body or statusCode field)
    if (!data || (!data.plainLyrics && !data.syncedLyrics)) return null;
    return data;
  } catch {
    return null;
  }
}

async function searchLRCLIB(query: string): Promise<LRCLIBItem | null> {
  try {
    const headers: Record<string, string> = {};
    const url = buildSearchUrl({ q: query });
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const items = await res.json() as LRCLIBItem[];
    if (!Array.isArray(items) || items.length === 0) return null;
    // Prefer items with synced lyrics
    const synced = items.find(i => i.syncedLyrics);
    return synced ?? items[0] ?? null;
  } catch {
    return null;
  }
}

function itemToResult(item: LRCLIBItem, matchType: 'exact' | 'fuzzy'): LyricsResult {
  const synced = item.syncedLyrics ? parseLRC(item.syncedLyrics) : null;
  return {
    synced: synced && synced.length > 0 ? synced : null,
    plain: item.plainLyrics ?? '',
    matchType,
  };
}

/**
 * Helper to fetch from LRCLIB using the best available strategy.
 */
async function fetchBestLRCLIB(rawTitle: string, rawArtist: string): Promise<LyricsResult | null> {
  const exactTitle = rawTitle.trim();
  const exactArtist = cleanArtist(rawArtist);
  const fuzzyTitle = cleanTitle(rawTitle);
  const fuzzyArtist = cleanArtist(rawArtist);

  const s1 = await fetchFromLRCLIB({ track_name: exactTitle, artist_name: exactArtist });
  if (s1) return itemToResult(s1, 'exact');

  if (fuzzyTitle !== exactTitle) {
    const s2 = await fetchFromLRCLIB({ track_name: fuzzyTitle, artist_name: fuzzyArtist });
    if (s2) return itemToResult(s2, 'fuzzy');
  }

  const s3 = await searchLRCLIB(`${fuzzyTitle} ${fuzzyArtist}`);
  if (s3) return itemToResult(s3, 'fuzzy');

  const s4 = await searchLRCLIB(fuzzyTitle);
  if (s4) return itemToResult(s4, 'fuzzy');

  return null;
}

/**
 * Helper to fetch from YouTube Music via our backend proxy.
 */
async function fetchYouTubeLyrics(rawTitle: string, rawArtist: string, videoId: string): Promise<LyricsResult | null> {
  try {
    const qs = new URLSearchParams();
    if (rawTitle) qs.set('track_name', rawTitle.trim());
    if (rawArtist) qs.set('artist_name', cleanArtist(rawArtist));
    qs.set('videoId', videoId);
    
    const res = await fetch(getApiUrl(`/api/lyrics?${qs.toString()}`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.plainLyrics || data.syncedLyrics) {
      const synced = data.syncedLyrics ? parseLRC(data.syncedLyrics) : null;
      return {
        synced: synced && synced.length > 0 ? synced : null,
        plain: data.plainLyrics ?? '',
        matchType: 'fuzzy',
      };
    }
  } catch {
    // Ignore proxy errors
  }
  return null;
}

/**
 * Helper to fetch from BetterLyrics (lyrics.ovh public API)
 */
async function fetchBetterLyrics(rawTitle: string, rawArtist: string): Promise<LyricsResult | null> {
  try {
    const artist = encodeURIComponent(cleanArtist(rawArtist));
    const title = encodeURIComponent(cleanTitle(rawTitle));
    const res = await fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.lyrics) {
      return {
        synced: null,
        plain: data.lyrics,
        matchType: 'fuzzy',
      };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Primary export — fetches lyrics using parallel providers and IDB caching.
 * Resolves with a Map/Record of provider results.
 */
export async function fetchLyrics(
  rawTitle: string,
  rawArtist: string,
  videoId?: string
): Promise<LyricsProviderMap> {
  const providers: LyricsProviderMap = {};

  if (videoId) {
    const cached = await getCachedLyrics(videoId);
    if (cached) return cached;
  }

  const promises: Promise<void>[] = [];

  // 1. LRCLIB Provider
  promises.push(
    fetchBestLRCLIB(rawTitle, rawArtist).then(res => {
      if (res && (res.plain || res.synced)) providers['lrclib'] = res;
    })
  );

  // 2. YouTube Music Provider
  if (videoId) {
    promises.push(
      fetchYouTubeLyrics(rawTitle, rawArtist, videoId).then(res => {
        if (res && (res.plain || res.synced)) providers['youtube'] = res;
      })
    );
  }

  // 3. BetterLyrics Provider (lyrics.ovh)
  if (rawTitle && rawArtist) {
    promises.push(
      fetchBetterLyrics(rawTitle, rawArtist).then(res => {
        if (res && (res.plain || res.synced)) providers['betterlyrics'] = res;
      })
    );
  }

  await Promise.allSettled(promises);

  if (videoId && Object.keys(providers).length > 0) {
    await setCachedLyrics(videoId, providers);
  }

  return providers;
}
