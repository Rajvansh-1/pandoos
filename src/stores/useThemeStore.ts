import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_THEME } from '@/utils/constants';
import { getRankForXP, computeXP, useGamificationStore, PANDA_RANKS } from './useGamificationStore';

export type ThemeId = 'dynamic';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
}

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
    })),
    {
      name: 'pandoos-theme-v2',
      partialize: () => ({}), // Don't persist activeTheme anymore
    }
  )
);

export const useThemeStore = useBaseThemeStore;
