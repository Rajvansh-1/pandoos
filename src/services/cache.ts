import { get, set } from 'idb-keyval';
import type { Track } from '@/types/track';

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const entry = await get<CacheEntry<T>>(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION;
    if (isExpired) return null;

    return entry.data;
  } catch (error) {
    console.warn(`Failed to read cache for ${key}:`, error);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    await set(key, entry);
  } catch (error) {
    console.warn(`Failed to write cache for ${key}:`, error);
  }
}

// Helper methods for specific data types
export async function getCachedTracks(query: string): Promise<Track[] | null> {
  return getCachedData<Track[]>(`tracks_${query.toLowerCase()}`);
}

export async function setCachedTracks(query: string, tracks: Track[]): Promise<void> {
  return setCachedData(`tracks_${query.toLowerCase()}`, tracks);
}
