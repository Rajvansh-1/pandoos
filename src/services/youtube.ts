import type { Track, YouTubeSearchItem } from '@/types/track';
import { YT_THUMB } from '@/utils/constants';
import { MOOD_SEEDS } from '@/data/moodSeeds';

function mapSearchItemToTrack(item: YouTubeSearchItem): Track {
  const videoId = item.id.videoId;
  return {
    id: videoId,
    videoId,
    title: item.snippet.title
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
    artist: item.snippet.channelTitle,
    albumArt: item.snippet.thumbnails.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
    source: 'youtube' as const,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  };
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
  const apiQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('audio') || query.toLowerCase().includes('music')
    ? query 
    : `${query} official audio song`;

  let res: Response | null = null;
  
  // Local DEV fallback so `npm run dev` works without Vercel CLI
  if (import.meta.env.DEV && import.meta.env.VITE_YOUTUBE_API_KEY) {
    const ytUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    ytUrl.searchParams.set('part', 'snippet');
    ytUrl.searchParams.set('q', apiQuery);
    ytUrl.searchParams.set('type', 'video');
    ytUrl.searchParams.set('videoCategoryId', '10'); // Music
    ytUrl.searchParams.set('maxResults', '15');
    ytUrl.searchParams.set('key', import.meta.env.VITE_YOUTUBE_API_KEY as string);
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
    
    return mapped;
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
      return mappedAlt;
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
    return fallbackResults.sort(() => 0.5 - Math.random());
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
