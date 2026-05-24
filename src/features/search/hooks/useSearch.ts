import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchTracks, getTrendingTracks } from '@/services/youtube';
import { QUERY_KEYS } from '@/utils/constants';

/**
 * Hook for YouTube search with TanStack Query caching.
 *
 * Key behaviours:
 * - staleTime: 2 hours — data is fresh for 2 hours, no refetch on focus/mount.
 * - gcTime: 48 hours — cache persists in memory even if component unmounts,
 *   so navigating away and back is instant (no loading state).
 * - placeholderData: keepPreviousData — while a NEW query fires, the previous
 *   results remain visible instead of showing a skeleton loader.
 * - enabled guard: query must be > 2 chars AND explicitly enabled (for lazy loading).
 */
export function useSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: () => searchTracks(query),
    enabled: query.trim().length > 2 && enabled,
    staleTime: 1000 * 60 * 120,         // 2 hours — no background re-fetches
    gcTime: 1000 * 60 * 60 * 48,        // 48 hours in-memory cache
    retry: 1,
    placeholderData: keepPreviousData,   // show old results while new ones load
    refetchOnWindowFocus: false,         // don't refetch when user tabs back
    refetchOnMount: false,               // don't refetch on re-mount / navigation
    refetchOnReconnect: false,           // don't refetch on network reconnect
  });
}

/**
 * Hook for fetching trending music.
 * Trending changes slowly — cache aggressively.
 */
export function useTrending(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.trending,
    queryFn: getTrendingTracks,
    enabled,
    staleTime: 1000 * 60 * 60 * 6,      // 6 hours fresh
    gcTime: 1000 * 60 * 60 * 48,        // 48 hours in-memory
    retry: 2,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
