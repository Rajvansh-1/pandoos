import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/useUIStore';

/**
 * Hook to manage hardware back button on mobile.
 * Whenever an overlay opens, it pushes a dummy state to the browser history.
 * When the back button is pressed, it intercepts the popstate event and closes the overlay
 * instead of exiting the app.
 */
export function useHardwareBack() {
  const uiStateRef = useRef({
    isPlayerOpen: false,
    isQueueOpen: false,
    isChatOpen: false,
    hasArtist: false,
    hasAlbum: false,
  });

  useEffect(() => {
    // Subscribe to UI store changes to push history state when overlays open
    const unsubscribe = useUIStore.subscribe((state, prevState) => {
      const prev = uiStateRef.current;
      const curr = {
        isPlayerOpen: state.isPlayerOpen,
        isQueueOpen: state.isQueueOpen,
        isChatOpen: state.isChatOpen,
        hasArtist: !!state.activeArtistId,
        hasAlbum: !!state.activeAlbumId,
      };

      const prevCount = Object.values(prev).filter(Boolean).length;
      const currCount = Object.values(curr).filter(Boolean).length;

      // Only push state if a NEW overlay was opened
      if (currCount > prevCount) {
        window.history.pushState({ isPandoosOverlay: true }, '');
      } 
      // If an overlay was closed programmatically (e.g. by clicking 'X' or swipe down),
      // we ideally want to remove the history state. 
      // But doing window.history.back() here could cause a race condition with actual navigation.
      // A common pattern is to just leave it, and let the back button act as a "go back" 
      // through the history. However, for a perfect UX, we can pop it if we know we just closed it.
      // But to keep it robust and simple, we rely on the popstate event to close the UI,
      // and if the user closes it via UI, we pop the state.
      else if (currCount < prevCount) {
        // Did we close it via UI or via back button?
        // We can't easily tell here. But if we check history.state, if it still says isPandoosOverlay,
        // it means we closed it via UI, so we should clean up the history.
        if (window.history.state?.isPandoosOverlay) {
           window.history.back();
        }
      }

      uiStateRef.current = curr;
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Listen to hardware back button
    const handlePopState = (e: PopStateEvent) => {
      const state = useUIStore.getState();
      
      // Close the topmost overlay in order of visual z-index / logical stack
      if (state.isChatOpen) {
        state.closeChat();
      } else if (state.activeArtistId) {
        state.closeArtist();
      } else if (state.activeAlbumId) {
        state.closeAlbum();
      } else if (state.isQueueOpen) {
        state.toggleQueue();
      } else if (state.isPlayerOpen) {
        state.closePlayer();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
