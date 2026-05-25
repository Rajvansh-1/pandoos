import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Track } from '@/types/track';
import { saveTrackBlob, deleteTrackBlob, getAllOfflineTracks, isTrackDownloaded } from '@/services/offlineDB';

interface OfflineState {
  downloadedTracks: Track[];
  downloadingIds: string[];
  isInitialized: boolean;
}

interface OfflineActions {
  initOfflineStore: () => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  removeTrack: (videoId: string) => Promise<void>;
  isDownloading: (videoId: string) => boolean;
  isDownloaded: (videoId: string) => boolean;
}

export const useOfflineStore = create<OfflineState & OfflineActions>()(
  immer((set, get) => ({
    downloadedTracks: [],
    downloadingIds: [],
    isInitialized: false,

    initOfflineStore: async () => {
      const tracks = await getAllOfflineTracks();
      set((state) => {
        state.downloadedTracks = tracks;
        state.isInitialized = true;
      });
    },

    downloadTrack: async (track: Track) => {
      if (get().downloadingIds.includes(track.videoId)) return;
      if (get().isDownloaded(track.videoId)) return;

      set((state) => {
        state.downloadingIds.push(track.videoId);
      });

      try {
        const res = await fetch(`/api/download?videoId=${track.videoId}`);
        if (!res.ok) throw new Error('Download failed');

        const blob = await res.blob();
        await saveTrackBlob(track, blob);

        set((state) => {
          state.downloadedTracks.push(track);
        });
      } catch (err) {
        console.error('Failed to download track:', err);
      } finally {
        set((state) => {
          state.downloadingIds = state.downloadingIds.filter(id => id !== track.videoId);
        });
      }
    },

    removeTrack: async (videoId: string) => {
      await deleteTrackBlob(videoId);
      set((state) => {
        state.downloadedTracks = state.downloadedTracks.filter(t => t.videoId !== videoId);
      });
    },

    isDownloading: (videoId: string) => {
      return get().downloadingIds.includes(videoId);
    },

    isDownloaded: (videoId: string) => {
      return get().downloadedTracks.some(t => t.videoId === videoId);
    }
  }))
);
