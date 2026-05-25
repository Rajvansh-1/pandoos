import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AudioQuality = 'high' | 'medium' | 'low';

interface SettingsState {
  audioQuality: AudioQuality;
  dataSaver: boolean;
  gaplessPlayback: boolean;
  autoPlay: boolean;
  
  // Actions
  setAudioQuality: (quality: AudioQuality) => void;
  setDataSaver: (enabled: boolean) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  resetSettings: () => void;
}

const initialState = {
  audioQuality: 'high' as AudioQuality,
  dataSaver: false,
  gaplessPlayback: true,
  autoPlay: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setAudioQuality: (quality) => set({ audioQuality: quality }),
      setDataSaver: (enabled) => set({ dataSaver: enabled }),
      setGaplessPlayback: (enabled) => set({ gaplessPlayback: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      resetSettings: () => set(initialState),
    }),
    {
      name: 'pandoos-settings',
    }
  )
);
