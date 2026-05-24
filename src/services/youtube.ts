import type { Track, YouTubeSearchItem } from '@/types/track';
import { YT_THUMB } from '@/utils/constants';

// Our new APIs return mapped `YouTubeSearchItem` structure
function mapSearchItemToTrack(item: YouTubeSearchItem): Track {
  const videoId = item.id.videoId;
  return {
    id: videoId,
    videoId,
    title: item.snippet.title, // Now already clean from InnerTube
    artist: item.snippet.channelTitle, // Clean from InnerTube
    albumArt: item.snippet.thumbnails.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: 0,
    source: 'youtube' as const,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    artistId: item.snippet.artistId,
    albumId: item.snippet.albumId,
  };
}

export function deduplicateTracks(tracks: Track[]): Track[] {
  const seen: Track[] = [];
  return tracks.filter(track => {
    if (seen.some(s => s.videoId === track.videoId)) return false;
    seen.push(track);
    return true;
  });
}

export async function searchTracks(query: string): Promise<Track[]> {
  const normalizedQuery = query.toLowerCase().trim();
  
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`);
    if (!res.ok) throw new Error('Search API failed');
    
    const data = (await res.json()) as { items: YouTubeSearchItem[] };
    const mapped = (data.items ?? []).map(mapSearchItemToTrack);
    
    return deduplicateTracks(mapped);
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

export async function getTrendingTracks(): Promise<Track[]> {
  try {
    const res = await fetch('/api/trending');
    if (!res.ok) throw new Error('Trending API failed');
    
    const data = (await res.json()) as { items: YouTubeSearchItem[] };
    const mapped = (data.items ?? []).map(mapSearchItemToTrack);
    
    return deduplicateTracks(mapped);
  } catch (error) {
    console.error('Trending failed:', error);
    return [];
  }
}

export async function getRadioTracks(videoId: string): Promise<Track[]> {
  try {
    const res = await fetch(`/api/radio?videoId=${videoId}`);
    if (!res.ok) throw new Error('Radio API failed');
    
    const data = (await res.json()) as { items: YouTubeSearchItem[] };
    const mapped = (data.items ?? []).map(mapSearchItemToTrack);
    
    return deduplicateTracks(mapped);
  } catch (error) {
    console.error('Radio failed:', error);
    return [];
  }
}

export function getBestThumbnail(videoId: string): string {
  return YT_THUMB.maxres(videoId);
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
