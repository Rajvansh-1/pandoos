import { useQuery } from '@tanstack/react-query';

export function useArtist(browseId: string | null) {
  return useQuery({
    queryKey: ['artist', browseId],
    queryFn: async () => {
      if (!browseId) throw new Error('No browseId');
      const res = await fetch(`/api/artist?id=${encodeURIComponent(browseId)}`);
      if (!res.ok) throw new Error('Failed to fetch artist');
      const data = await res.json();
      return data.artist;
    },
    enabled: !!browseId,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}
