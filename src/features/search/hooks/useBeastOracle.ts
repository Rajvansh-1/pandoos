import { useQuery } from '@tanstack/react-query';
import type { Track } from '@/types/track';

export interface VibePlaylist {
  id: string;
  title: string;
  query: string;
  songs: Track[];
}

interface OracleResponse {
  oracle: VibePlaylist[];
}

export function useBeastOracle() {
  return useQuery({
    queryKey: ['beastOracle'],
    queryFn: async (): Promise<OracleResponse> => {
      const res = await fetch('/api/oracle');
      if (!res.ok) throw new Error('Oracle API failed');
      return res.json();
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    retry: 1
  });
}
