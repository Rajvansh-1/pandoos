import { get, set } from 'idb-keyval';
import type { LyricsResult } from './lyrics';

export type LyricsProviderMap = Record<string, LyricsResult>;

export const LYRICS_CACHE_PREFIX = 'lyrics_';
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  timestamp: number;
  providers: LyricsProviderMap;
}

export async function getCachedLyrics(videoId: string): Promise<LyricsProviderMap | null> {
  if (!videoId) return null;
  try {
    const entry = await get<CacheEntry>(`${LYRICS_CACHE_PREFIX}${videoId}`);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      // Expired
      return null;
    }
    return entry.providers;
  } catch (err) {
    console.warn('Failed to read from lyrics cache:', err);
    return null;
  }
}

export async function setCachedLyrics(videoId: string, providers: LyricsProviderMap): Promise<void> {
  if (!videoId) return;
  try {
    await set(`${LYRICS_CACHE_PREFIX}${videoId}`, {
      timestamp: Date.now(),
      providers,
    });
  } catch (err) {
    console.warn('Failed to write to lyrics cache:', err);
  }
}
