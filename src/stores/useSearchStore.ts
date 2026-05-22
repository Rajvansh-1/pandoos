import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/types/track';

interface SearchState {
  recentQueries: string[];
  recentTracks: Track[];
  addQuery: (query: string) => void;
  addTrack: (track: Track) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentQueries: [],
      recentTracks: [],
      addQuery: (query) => set((state) => {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 2) return state;
        const filtered = state.recentQueries.filter(item => item !== q);
        return { recentQueries: [q, ...filtered].slice(0, 10) };
      }),
      addTrack: (track) => set((state) => {
        const filtered = state.recentTracks.filter(item => item.id !== track.id);
        return { recentTracks: [track, ...filtered].slice(0, 10) };
      }),
      clearHistory: () => set({ recentQueries: [], recentTracks: [] }),
    }),
    {
      name: 'pandoos-search-storage',
    }
  )
);
