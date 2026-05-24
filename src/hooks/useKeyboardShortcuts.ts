import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useToastStore } from '@/stores/useToastStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, etc.
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if a modifier key (except Shift) is pressed, to not interfere with browser shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const store = usePlayerStore.getState();

      switch (e.code) {
        case 'Space':
        case 'KeyK': // Common shortcut for play/pause
          e.preventDefault(); // Prevent page scrolling down
          store.togglePlayPause();
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            store.nextTrack();
          } else if (store.duration > 0) {
            const newProgress = Math.min(1, store.progress + (5 / store.duration));
            store.seekTo(newProgress);
          }
          break;
        case 'KeyL': // Forward (similar to YouTube)
          e.preventDefault();
          store.nextTrack();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            store.prevTrack();
          } else if (store.duration > 0) {
            const newProgress = Math.max(0, store.progress - (5 / store.duration));
            store.seekTo(newProgress);
          }
          break;
        case 'KeyJ': // Backward (similar to YouTube)
          e.preventDefault();
          store.prevTrack();
          break;

        case 'ArrowUp': {
          e.preventDefault();
          const newVolUp = Math.min(1, store.volume + 0.1);
          store.setVolume(newVolUp);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          const newVolDown = Math.max(0, store.volume - 0.1);
          store.setVolume(newVolDown);
          break;
        }

        case 'KeyM':
          e.preventDefault();
          store.toggleMute();
          break;

        case 'KeyS':
          e.preventDefault();
          store.toggleShuffle();
          break;

        case 'KeyR':
          e.preventDefault();
          store.toggleLoop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
