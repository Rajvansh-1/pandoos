import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_THEME } from '@/utils/constants';
import { getRankForXP, computeXP, useGamificationStore, PANDA_RANKS } from './useGamificationStore';

export type ThemeId = 'dynamic' | 'zen' | 'midnight' | 'cyberpunk' | 'gold';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  requiredRank: string;
  previewGradient: string;
}

export const THEMES: ThemeConfig[] = [
  { id: 'dynamic', name: 'Dynamic Mood', description: 'Adapts to the album art of the currently playing song.', requiredRank: 'Panda Egg', previewGradient: 'from-violet-500 via-fuchsia-500 to-pink-500' },
  { id: 'zen', name: 'Zen Bamboo', description: 'A peaceful, calming forest aesthetic for deep focus.', requiredRank: 'Panda Cub', previewGradient: 'from-emerald-400 to-teal-600' },
  { id: 'midnight', name: 'Midnight Purple', description: 'Deep royal purples for late-night listening sessions.', requiredRank: 'Groove Panda', previewGradient: 'from-indigo-600 via-purple-600 to-violet-800' },
  { id: 'cyberpunk', name: 'Neon Cyberpunk', description: 'High contrast neon pinks and cyan blues. Maximum energy.', requiredRank: 'Star Panda', previewGradient: 'from-pink-500 via-red-500 to-yellow-500' },
  { id: 'gold', name: 'Pure Gold', description: 'The ultimate flex. Pure luxury for Legend Pandas.', requiredRank: 'Legend Panda', previewGradient: 'from-yellow-300 via-amber-400 to-yellow-600' },
];

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
}

interface ThemeState {
  colors: ThemeColors;
  isExtracting: boolean;
  activeTheme: ThemeId;
}

interface ThemeActions {
  applyColors: (colors: Partial<ThemeColors>) => void;
  resetToDefault: () => void;
  setIsExtracting: (val: boolean) => void;
  setActiveTheme: (id: ThemeId) => void;
  getUnlockedThemes: () => ThemeId[];
}

type ThemeStore = ThemeState & ThemeActions;

function applyCSSVars(colors: Partial<ThemeColors>): void {
  const root = document.documentElement;
  if (colors.primary !== undefined) {
    root.style.setProperty('--color-primary', colors.primary);
    const hue = colors.primary.split(' ')[0];
    root.style.setProperty('--surface-base', `${hue} 30% 10%`);
    root.style.setProperty('--surface-elevated', `${hue} 25% 14%`);
    root.style.setProperty('--surface-overlay', `${hue} 20% 18%`);
    root.style.setProperty('--text-primary', `${hue} 20% 96%`);
    root.style.setProperty('--text-secondary', `${hue} 15% 75%`);
    root.style.setProperty('--text-muted', `${hue} 10% 55%`);
  }
  if (colors.secondary !== undefined) root.style.setProperty('--color-secondary', colors.secondary);
  if (colors.accent !== undefined) root.style.setProperty('--color-accent', colors.accent);
  if (colors.muted !== undefined) root.style.setProperty('--color-muted', colors.muted);
}

// We split the store: persist ONLY activeTheme, let colors be transient
const useBaseThemeStore = create<ThemeStore>()(
  persist(
    immer((set, get) => ({
      colors: { ...DEFAULT_THEME },
      isExtracting: false,
      activeTheme: 'dynamic',

      applyColors: (newColors) => {
        // Only apply inline CSS vars if we are using the dynamic theme!
        // If a static theme is applied, the CSS class !important rules will override these anyway,
        // but it's good practice.
        applyCSSVars(newColors);
        set((state) => { Object.assign(state.colors, newColors); });
      },

      resetToDefault: () => {
        applyCSSVars(DEFAULT_THEME);
        set((state) => { state.colors = { ...DEFAULT_THEME }; });
      },

      setIsExtracting: (val) => {
        set((state) => { state.isExtracting = val; });
      },

      setActiveTheme: (id) => {
        set((state) => { state.activeTheme = id; });
      },

      getUnlockedThemes: () => {
        const gamificationState = useGamificationStore.getState();
        const currentXP = computeXP(gamificationState as any);
        const currentRank = getRankForXP(currentXP);

        return THEMES.filter((theme) => {
          const reqRank = PANDA_RANKS.find((r) => r.name === theme.requiredRank);
          if (!reqRank) return true;
          return reqRank.minXP <= currentRank.minXP;
        }).map(t => t.id);
      },
    })),
    {
      name: 'pandoos-theme-v2',
      partialize: (state) => ({ activeTheme: state.activeTheme }), // ONLY persist activeTheme
    }
  )
);

export const useThemeStore = useBaseThemeStore;
