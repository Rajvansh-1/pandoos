import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AudioQuality = 'high' | 'medium' | 'low';

interface SettingsState {
  audioQuality: AudioQuality;
  dataSaver: boolean;
  gaplessPlayback: boolean;
  autoPlay: boolean;
  equalizer: {
    preset: string;
    bands: number[]; // 60, 230, 910, 3600, 14000 Hz
  };
  
  // Actions
  setAudioQuality: (quality: AudioQuality) => void;
  setDataSaver: (enabled: boolean) => void;
  setGaplessPlayback: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setEqualizer: (preset: string, bands: number[]) => void;
  resetSettings: () => void;
}

const initialState = {
  audioQuality: 'high' as AudioQuality,
  dataSaver: false,
  gaplessPlayback: true,
  autoPlay: true,
  equalizer: {
    preset: 'Flat',
    bands: [0, 0, 0, 0, 0],
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setAudioQuality: (quality) => set({ audioQuality: quality }),
      setDataSaver: (enabled) => set({ dataSaver: enabled }),
      setGaplessPlayback: (enabled) => set({ gaplessPlayback: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      setEqualizer: (preset, bands) => set({ equalizer: { preset, bands } }),
      resetSettings: () => set(initialState),
    }),
    {
      name: 'pandoos-settings',
    }
  )
);
