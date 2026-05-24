import { create } from 'zustand';

interface UIState {
  isPlayerOpen: boolean;
  isQueueOpen: boolean;
  activeArtistId: string | null;
  activeAlbumId: string | null;
  openPlayer: () => void;
  closePlayer: () => void;
  toggleQueue: () => void;
  openArtist: (id: string) => void;
  closeArtist: () => void;
  openAlbum: (id: string) => void;
  closeAlbum: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPlayerOpen: false,
  isQueueOpen: false,
  activeArtistId: null,
  activeAlbumId: null,
  openPlayer: () => set({ isPlayerOpen: true }),
  closePlayer: () => set({ isPlayerOpen: false }),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  openArtist: (id) => set({ activeArtistId: id }),
  closeArtist: () => set({ activeArtistId: null }),
  openAlbum: (id) => set({ activeAlbumId: id }),
  closeAlbum: () => set({ activeAlbumId: null }),
}));

