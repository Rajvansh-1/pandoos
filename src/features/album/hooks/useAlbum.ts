import { useQuery } from '@tanstack/react-query';

export function useAlbum(browseId: string | null) {
  return useQuery({
    queryKey: ['album', browseId],
    queryFn: async () => {
      if (!browseId) throw new Error('No browseId');
      const res = await fetch(`/api/album?id=${encodeURIComponent(browseId)}`);
      if (!res.ok) throw new Error('Failed to fetch album');
      const data = await res.json();
      return data.album;
    },
    enabled: !!browseId,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}
