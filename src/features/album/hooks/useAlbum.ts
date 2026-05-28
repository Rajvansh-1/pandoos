import { useQuery } from '@tanstack/react-query';
import type { Track } from '@/types/track';
import { getApiUrl } from '@/utils/api';

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  tracks: Track[];
}

export function useAlbum(browseId: string | null) {
  return useQuery({
    queryKey: ['album', browseId],
    queryFn: async () => {
      if (!browseId) throw new Error('No browseId');
      const res = await fetch(getApiUrl(`/api/album?id=${encodeURIComponent(browseId)}`));
      if (!res.ok) throw new Error('Failed to fetch album');
      const data = await res.json();
      return data.album;
    },
    enabled: !!browseId,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}
