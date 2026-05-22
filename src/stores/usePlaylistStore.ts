import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/types/track';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: number;
}

interface PlaylistStore {
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
}

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set) => ({
      playlists: [],

      createPlaylist: (name, description) =>
        set((state) => ({
          playlists: [
            ...state.playlists,
            {
              id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              name,
              description,
              tracks: [],
              createdAt: Date.now(),
            },
          ],
        })),

      deletePlaylist: (id) =>
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        })),

      addTrackToPlaylist: (playlistId, track) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              // Prevent duplicates
              if (p.tracks.find((t) => t.id === track.id)) return p;
              return { ...p, tracks: [...p.tracks, track] };
            }
            return p;
          }),
        })),

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
            }
            return p;
          }),
        })),
    }),
    {
      name: 'pandoos-playlists',
    }
  )
);
