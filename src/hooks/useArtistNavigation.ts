import { useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useToastStore } from '@/stores/useToastStore';
import { searchTracks } from '@/services/youtube';

export function useArtistNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);
  const openArtist = useUIStore((state) => state.openArtist);
  const addToast = useToastStore((state) => state.addToast);

  const navigateToArtist = async (artistName: string, knownArtistId?: string | null) => {
    if (knownArtistId) {
      openArtist(knownArtistId);
      return;
    }

    if (!artistName || artistName === 'Unknown Artist' || artistName === 'Unknown') {
      addToast('Artist information is not available', 'error');
      return;
    }

    setIsNavigating(true);
    try {
      // Add a small toast so the user knows it's loading if it takes a moment
      const loadingToastId = Date.now().toString();
      addToast(`Finding ${artistName}...`, 'info');

      const { artists } = await searchTracks(artistName);
      if (artists && artists.length > 0 && artists[0].artistId) {
        openArtist(artists[0].artistId);
      } else {
        addToast('Artist page not found', 'error');
      }
    } catch (error) {
      addToast('Error finding artist', 'error');
      console.error('[useArtistNavigation] Error:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  return { navigateToArtist, isNavigating };
}
