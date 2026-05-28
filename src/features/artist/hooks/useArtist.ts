import { useQuery } from '@tanstack/react-query';
import type { Track } from '@/types/track';
import { getApiUrl } from '@/utils/api';

export interface ArtistDetails {
  name: string;
  browseId: string;
  thumbnails: { url: string; width: number; height: number }[];
  songs: Track[];
}

export function useArtist(browseId: string | null) {
  return useQuery({
    queryKey: ['artist', browseId],
    queryFn: async () => {
      if (!browseId) throw new Error('No browseId');
      const res = await fetch(getApiUrl(`/api/artist?id=${encodeURIComponent(browseId)}`));
      if (!res.ok) throw new Error('Failed to fetch artist');
      const data = await res.json();
      return data.artist;
    },
    enabled: !!browseId,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}
