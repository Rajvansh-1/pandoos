import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { extractColors } from '@/services/color';
import { getBestThumbnail } from '@/services/youtube';

/**
 * useColorExtractor — The heart of the Mood Engine.
 * 
 * Automatically listens to track changes, fetches the highest-res thumbnail,
 * extracts the dominant/vibrant/muted palette, and updates the ThemeStore
 * (which in turn injects the CSS variables for 60fps transitions).
 * 
 * Mount this once in the App shell or FullscreenPlayer.
 */
export function useColorExtractor() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const applyColors = useThemeStore((state) => state.applyColors);
  const resetToDefault = useThemeStore((state) => state.resetToDefault);
  const setIsExtracting = useThemeStore((state) => state.setIsExtracting);

  useEffect(() => {
    if (!currentTrack) {
      resetToDefault();
      return;
    }

    let isMounted = true;
    let timeoutId: number;

    async function runExtraction() {
      setIsExtracting(true);
      try {
        // Use HQ thumbnail because maxresdefault can return a grey 404 image 
        // that successfully loads but turns the theme completely black!
        const imageUrl = `https://i.ytimg.com/vi/${currentTrack!.videoId}/hqdefault.jpg`;
        
        // Due to CORS, we need the image to be served with proper headers.
        // YouTube's i.ytimg.com supports CORS.
        const colors = await extractColors(imageUrl);
        
        if (isMounted && colors) {
          applyColors(colors);
        }
      } catch (err) {
        console.error('Mood Engine color extraction failed:', err);
        // We leave the previous colors (or default) instead of resetting
        // to prevent jarring flashes.
      } finally {
        if (isMounted) {
          setIsExtracting(false);
        }
      }
    }

    // Delay extraction slightly to ensure the player UI animation finishes rendering first, preventing lag
    timeoutId = window.setTimeout(() => {
      runExtraction();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentTrack?.videoId, applyColors, resetToDefault, setIsExtracting]);
}
