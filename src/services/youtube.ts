import type { Track, YouTubeSearchItem } from '@/types/track';
import { YT_THUMB } from '@/utils/constants';
import { MOOD_SEEDS } from '@/data/moodSeeds';
import { areTitlesSimilar } from '@/utils/trackDedup';

// ─────────────────────────────────────────────────────────────────────────────
// Title / Artist Cleaning
//
// YouTube video titles are written for SEO and have a lot of noise:
//   "Olivia Rodrigo - the cure (Official Music Video)"
//   "DESPACITO - Luis Fonsi ft. Daddy Yankee (Official Video)"
//   "Never Gonna Give You Up [HD Remaster]"
//   "Shakira, Burna Boy - Dai Dai (Official Video)"
//
// We parse them to extract: { songName, artistName }
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns stripped from the song name part */
const NOISE_PATTERNS = [
  // Parenthesised suffixes — must strip these, but keep (feat. X) only if no other artist
  /\s*\((official\s*(music\s*)?video|official\s*audio|audio|lyric\s*video?|lyrics?|visualizer|animated\s*video|hd\s*remaster(ed)?|remaster(ed)?|4k|hq|explicit|clean\s*version|radio\s*edit|full\s*video|movie\s*song|film\s*song|latest\s*song|new\s*song|original|topic|vevo|live|acoustic)\)/gi,
  // Bracketed suffixes — same idea
  /\s*\[(official\s*(music\s*)?video|official\s*audio|audio|lyric\s*video?|lyrics?|visualizer|hd\s*remaster(ed)?|remaster(ed)?|4k|hq|explicit|clean\s*version|radio\s*edit|full\s*video|movie\s*song|film\s*song|latest\s*song|new\s*song|original|live|acoustic)\]/gi,
  // Anything inside parens that's "ft." or "feat." — pull artist from here later
  /\s*\(\s*(?:ft\.|feat\.?)\s+[^)]+\)/gi,
  // "| Official Audio" style pipe suffixes
  /\s*\|\s*.*/g,
  // "//  comments" style
  /\s*\/\/.*/g,
  // Trailing year in parens e.g. (2023)
  /\s*\(\d{4}\)/g,
  // "- Official Music Video" without parens
  /\s*-\s*official\s*(music\s*)?video.*/gi,
  /\s*-\s*official\s*audio.*/gi,
  /\s*-\s*lyric\s*video?.*/gi,
  /\s*-\s*lyrics?.*/gi,
];

/** Clean channel name to artist name */
function cleanChannelName(channel: string): string {
  return channel
    .replace(/VEVO$/i, '')          // OliviaRodrigoVEVO → OliviaRodrigo
    .replace(/\s*-\s*Topic$/i, '')  // Artist - Topic → Artist
    .replace(/\s*Official$/i, '')   // ArtistOfficial → Artist
    .replace(/\s*Music$/i, '')      // ArtistMusic → Artist
    // Split CamelCase only if no spaces (channel names like "OliviaRodrigo")
    .replace(/([a-z])([A-Z])/g, (_, a, b) => `${a} ${b}`)
    .trim();
}

/**
 * Parse a YouTube video title into a clean song name and artist.
 *
 * YouTube titles come in these formats (order matters):
 *  1. "Artist - Song Name (noise)"      → most common
 *  2. "Song Name - Artist (noise)"      → rare
 *  3. "Artist1, Artist2 - Song (noise)" → multi-artist
 *  4. "Song Name (noise)"               → no dash separator
 */
function parseTitle(
  rawTitle: string,
  channelTitle: string
): { songName: string; artistName: string } {
  // Decode HTML entities first
  let title = rawTitle
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Extract feat. artist before we strip the parens
  const featMatch = title.match(/\(\s*(?:ft\.|feat\.?)\s+([^)]+)\)/i);
  const featArtist = featMatch ? featMatch[1]!.trim() : null;

  // Strip all noise patterns from the full title
  for (const pattern of NOISE_PATTERNS) {
    title = title.replace(pattern, '');
  }
  title = title.trim().replace(/\s{2,}/g, ' ').replace(/[-–—\s]+$/, '').trim();

  // Try to find a " - " separator (the most reliable split point)
  // Use a dash surrounded by spaces to avoid splitting hyphenated words
  const dashIdx = title.search(/\s[-–—]\s/);

  let songName: string;
  let artistName: string;

  if (dashIdx > 0) {
    const left = title.slice(0, dashIdx).trim();
    const right = title.slice(dashIdx + 3).trim(); // skip " - "

    // Heuristic: if left side looks like an artist (short, title-case, no common words)
    // and right side is the song. Usually "Artist - Song", sometimes "Song - Artist".
    // We pick the shorter of the two as the artist if we can't tell.
    const leftWords = left.split(/\s+/).length;
    const rightWords = right.split(/\s+/).length;

    // If left is ≤3 words and right is longer, left is probably the artist
    if (leftWords <= 3 || leftWords < rightWords) {
      artistName = left;
      songName = right;
    } else {
      songName = left;
      artistName = right;
    }
  } else {
    // No dash — the whole thing is the song name, use channel as artist
    songName = title;
    artistName = cleanChannelName(channelTitle);
  }

  // If feat. artist exists, add them to the artist field
  if (featArtist) {
    artistName = `${artistName} ft. ${featArtist}`;
  }

  // Final cleanup: remove any remaining trailing noise from song name
  songName = songName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  artistName = artistName.trim();

  // Fallback: if artistName is empty, use cleaned channel
  if (!artistName) artistName = cleanChannelName(channelTitle);

  return { songName, artistName };
}

function mapSearchItemToTrack(item: YouTubeSearchItem): Track {
  const videoId = item.id.videoId;
  const { songName, artistName } = parseTitle(
    item.snippet.title,
    item.snippet.channelTitle
  );
  return {
    id: videoId,
    videoId,
    title: songName,
    artist: artistName,
    albumArt: item.snippet.thumbnails.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
    source: 'youtube' as const,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  };
}


export function deduplicateTracks(tracks: Track[]): Track[] {
  const seen: Track[] = [];
  
  return tracks.filter(track => {
    // 1. Deduplicate by exact videoId
    if (seen.some(s => s.videoId === track.videoId)) return false;
    
    // 2. Deduplicate by advanced title similarity (Jaccard word match + substrings)
    if (seen.some(s => areTitlesSimilar(s.title, track.title))) {
      return false;
    }
    
    seen.push(track);
    return true;
  });
}

export async function searchTracks(query: string): Promise<Track[]> {
  // 1. Intercept predefined mood queries to avoid API quota hits (Layer 2 Scalability)
  const MOOD_QUERIES: Record<string, string> = {
    'lofi chill relax aesthetic': 'chill',
    'high energy upbeat edm hits': 'energy',
    'deep focus ambient electronic': 'focus',
    'romantic love songs acoustic': 'romantic',
    'heavy workout gym phonk': 'workout',
    'sad emotional acoustic': 'heartbroken',
    'sleep ambient delta waves': 'sleepy',
    'late night drive synthwave retro': 'latenight',
    'happy feel good uplifting pop': 'happy',
    'bollywood pop romantic hits': 'bollywood',
    'desi hip hop punjabi swag': 'desi',
    'sufi ghazal peaceful lo-fi': 'sufi',
    'bhakti bhajan devotional peaceful': 'devotional',
    'punjabi hit pop party workout': 'desi',
  };

  const normalizedQuery = query.toLowerCase().trim();
  let moodId = MOOD_QUERIES[normalizedQuery];
  
  if (!moodId) {
    if (normalizedQuery.includes('sad') || normalizedQuery.includes('saad') || normalizedQuery.includes('cry')) moodId = 'heartbroken';
    else if (normalizedQuery.includes('work') || normalizedQuery.includes('gym')) moodId = 'workout';
    else if (normalizedQuery.includes('sleep') || normalizedQuery.includes('bed')) moodId = 'sleepy';
    else if (normalizedQuery.includes('love') || normalizedQuery.includes('romanc')) moodId = 'romantic';
    else if (normalizedQuery.includes('party') || normalizedQuery.includes('dance')) moodId = 'energy';
    else if (normalizedQuery.includes('focus') || normalizedQuery.includes('study')) moodId = 'focus';
    else if (normalizedQuery.includes('bolly')) moodId = 'bollywood';
    else if (normalizedQuery.includes('desi') || normalizedQuery.includes('punjab')) moodId = 'desi';
  }

  if (moodId && MOOD_SEEDS[moodId]) {
    // Return seeds instantly, wrapped in a resolved promise
    return Promise.resolve(MOOD_SEEDS[moodId]);
  }

  // Force pure song results
  const apiQuery = query === 'TSERIES_LATEST'
    ? query
    : (query.toLowerCase().includes('song') || query.toLowerCase().includes('audio') || query.toLowerCase().includes('music')
      ? query 
      : `${query} official audio song`);

  let res: Response | null = null;
  
  if (import.meta.env.DEV && import.meta.env.VITE_YOUTUBE_API_KEY) {
    const ytUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    ytUrl.searchParams.set('part', 'snippet');
    ytUrl.searchParams.set('type', 'video');
    ytUrl.searchParams.set('videoCategoryId', '10'); // Music
    ytUrl.searchParams.set('maxResults', '15');
    ytUrl.searchParams.set('key', import.meta.env.VITE_YOUTUBE_API_KEY as string);
    
    if (apiQuery === 'TSERIES_LATEST') {
      ytUrl.searchParams.set('channelId', 'UCq-Fj5jknLsUf-MWSy4_brA');
      ytUrl.searchParams.set('order', 'date');
    } else {
      ytUrl.searchParams.set('q', apiQuery);
    }
    
    res = await fetch(ytUrl.toString());
  } else {
    // Production uses serverless proxy + caching
    res = await fetch(`/api/search?q=${encodeURIComponent(apiQuery)}&type=music`);
  }

  if (res && res.ok) {
    const data = (await res.json()) as { items: YouTubeSearchItem[] };
    let mapped = (data.items ?? []).map(mapSearchItemToTrack);
    
    // Aggressive client-side filtering to guarantee a pure music experience
    mapped = mapped.filter(track => {
      const titleLower = track.title.toLowerCase();
      const forbiddenTerms = [
        '#shorts', 'tutorial', 'episode', 'podcast', 'interview', 
        'vlog', 'review', 'unboxing', 'reaction', 'gameplay', 
        'how to', 'full match', 'highlights'
      ];
      return !forbiddenTerms.some(term => titleLower.includes(term));
    });
    
    return deduplicateTracks(mapped);
  }

  // 2. Client-side fallback to Unofficial YouTube Music API
  try {
    // @ts-ignore
    const YoutubeMusicApi = (await import('youtube-music-api')).default;
    const api = new YoutubeMusicApi();
    await api.initalize();
    const result = await api.search(query, 'song');
    
    if (result && result.content && result.content.length > 0) {
      const mappedAlt: Track[] = result.content.slice(0, 15).map((item: any) => ({
        id: item.videoId,
        videoId: item.videoId,
        title: item.name,
        artist: item.artist?.name || 'Unknown Artist',
        albumArt: item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        duration: 0,
        source: 'youtube' as const,
        channelTitle: item.artist?.name || 'Unknown',
        publishedAt: new Date().toISOString(),
      }));
      return deduplicateTracks(mappedAlt);
    }
  } catch (e) {
    console.warn('YouTube Music API Fallback failed:', e);
  }

  // 3. Client-side fallback if both APIs fail
  const fallbackResults: Track[] = [];
  const searchTerms = normalizedQuery.split(' ').filter(t => t.length > 2);
  Object.values(MOOD_SEEDS).flat().forEach(track => {
    const trackText = `${track.title} ${track.artist}`.toLowerCase();
    const isMatch = searchTerms.some(term => trackText.includes(term));
    if (isMatch && !fallbackResults.find(t => t.id === track.id)) {
      fallbackResults.push(track);
    }
  });
  
  if (fallbackResults.length > 0) {
    return deduplicateTracks(fallbackResults.sort(() => 0.5 - Math.random()));
  }

  // If nothing matches, just return chill mood
  return MOOD_SEEDS['chill'];
}

export async function getTrendingTracks(): Promise<Track[]> {
  let res: Response | undefined;
  
  if (import.meta.env.DEV && import.meta.env.VITE_YOUTUBE_API_KEY) {
    const ytUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    ytUrl.searchParams.set('part', 'snippet');
    ytUrl.searchParams.set('chart', 'mostPopular');
    ytUrl.searchParams.set('videoCategoryId', '10');
    ytUrl.searchParams.set('maxResults', '15');
    ytUrl.searchParams.set('key', import.meta.env.VITE_YOUTUBE_API_KEY as string);
    try {
      res = await fetch(ytUrl.toString());
    } catch (e) {
      // fallback
    }
    
    if (res?.ok) {
      const data = await res.json();
      const items = data.items.map((item: any) => ({
        id: { videoId: item.id },
        snippet: item.snippet
      }));
      return items.map(mapSearchItemToTrack);
    }
  }

  if (!res || !res.ok) {
    res = await fetch('/api/trending');
  }

  if (!res || !res.ok) {
    // Client-side fallback if no API key in DEV or API fails
    const allTracks = Object.values(MOOD_SEEDS).flat();
    return allTracks.sort(() => 0.5 - Math.random()).slice(0, 15);
  }

  const data = (await res.json()) as { items: YouTubeSearchItem[] };
  return (data.items ?? []).map(mapSearchItemToTrack);
}

export function getBestThumbnail(videoId: string): string {
  return YT_THUMB.maxres(videoId);
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
