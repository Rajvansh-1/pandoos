import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_THEME } from '@/utils/constants';

interface ThemeColors {
  /** HSL string without `hsl()` wrapper, e.g. "270 80% 68%" */
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
}

interface ThemeState {
  colors: ThemeColors;
  isExtracting: boolean;
}

interface ThemeActions {
  /**
   * Apply extracted colors to the store AND inject them into CSS variables.
   * CSS variables are set directly on :root — this triggers 60fps transitions
   * defined in index.css without any React re-renders.
   */
  applyColors: (colors: Partial<ThemeColors>) => void;
  resetToDefault: () => void;
  setIsExtracting: (val: boolean) => void;
}

type ThemeStore = ThemeState & ThemeActions;

function applyCSSVars(colors: Partial<ThemeColors>): void {
  const root = document.documentElement;
  if (colors.primary !== undefined) {
    root.style.setProperty('--color-primary', colors.primary);
    // Dynamically update background surfaces to match the primary hue,
    // creating a rich "alive" feel rather than a flat black.
    const hue = colors.primary.split(' ')[0];
    root.style.setProperty('--surface-base', `${hue} 30% 10%`);
    root.style.setProperty('--surface-elevated', `${hue} 25% 14%`);
    root.style.setProperty('--surface-overlay', `${hue} 20% 18%`);

    // Dynamically tint the typography so it's not plain white/grey
    root.style.setProperty('--text-primary', `${hue} 20% 96%`);
    root.style.setProperty('--text-secondary', `${hue} 15% 75%`);
    root.style.setProperty('--text-muted', `${hue} 10% 55%`);
  }
  if (colors.secondary !== undefined) root.style.setProperty('--color-secondary', colors.secondary);
  if (colors.accent !== undefined) root.style.setProperty('--color-accent', colors.accent);
  if (colors.muted !== undefined) root.style.setProperty('--color-muted', colors.muted);
}

/**
 * useThemeStore — Manages dynamic color theming (the Mood Engine).
 *
 * Architectural note: CSS variables are mutated directly on document.documentElement
 * in addition to being stored in Zustand. The CSS transition on `*` in index.css
 * handles smooth color transitions at 60fps. Storing colors in Zustand allows
 * components to read them for things like canvas rendering or Three.js materials
 * that can't read CSS variables directly.
 */
export const useThemeStore = create<ThemeStore>()(
  immer((set) => ({
    colors: { ...DEFAULT_THEME },
    isExtracting: false,

    applyColors: (newColors) => {
      // Apply to DOM immediately (no React render needed for CSS)
      applyCSSVars(newColors);
      set((state) => {
        Object.assign(state.colors, newColors);
      });
    },

    resetToDefault: () => {
      applyCSSVars(DEFAULT_THEME);
      set((state) => {
        state.colors = { ...DEFAULT_THEME };
      });
    },

    setIsExtracting: (val) => {
      set((state) => { state.isExtracting = val; });
    },
  }))
);
