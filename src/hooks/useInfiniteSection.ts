import { useInfiniteQuery } from '@tanstack/react-query';
import { searchTracks } from '@/services/youtube';
import type { Track } from '@/types/track';

interface UseInfiniteSectionOptions {
  query: string;
  enabled?: boolean;
}

/**
 * useInfiniteSection
 * Fetches tracks infinitely for a given query by varying the "pageParam"
 * to hit different search results variations.
 */
export function useInfiniteSection({ query, enabled = true }: UseInfiniteSectionOptions) {
  return useInfiniteQuery({
    queryKey: ['infinite-section', query],
    queryFn: async ({ pageParam = 0 }) => {
      // Vary the query slightly per page to get fresh results.
      // We append keywords like "latest", "hits", or a random year to trick the YT engine into returning more diverse sets.
      const variations = ['', 'hits', 'latest', 'popular', new Date().getFullYear().toString(), 'best', 'remix', 'live'];
      const variation = variations[pageParam % variations.length];
      
      // If we've exhausted our basic variations, add random noise
      const noise = pageParam >= variations.length ? ` ${Math.random().toString(36).substring(7)}` : '';
      
      const modifiedQuery = `${query} ${variation}${noise}`.trim();
      
      const { songs } = await searchTracks(modifiedQuery);
      return songs as Track[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // Always allow loading more unless an API error returned 0 results
      return lastPage.length === 0 ? undefined : allPages.length;
    },
    initialPageParam: 0,
    enabled: enabled && !!query,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
