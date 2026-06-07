import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { getBestThumbnail } from '@/services/youtube';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';

/**
 * useMediaSession — Integrates with the browser's Media Session API.
 * 
 * Provides lock-screen controls, hardware media key support, and 
 * Bluetooth car/headphone control integration.
 * This should be mounted exactly once (alongside useAudioEngine in App.tsx).
 */
export function useMediaSession() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const prevTrack = usePlayerStore((state) => state.prevTrack);
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      if (currentTrack) {
        MediaSession.setMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: 'Pandoos Music',
          artwork: [{ src: currentTrack.albumArt, sizes: '512x512', type: 'image/jpeg' }],
        }).catch(console.error);
      }
      
      MediaSession.setPlaybackState({
        playbackState: isPlaying ? 'playing' : 'paused'
      }).catch(console.error);

      // Register native handlers
      MediaSession.setActionHandler({ action: 'play' }, () => togglePlayPause()).catch(()=>{});
      MediaSession.setActionHandler({ action: 'pause' }, () => togglePlayPause()).catch(()=>{});
      MediaSession.setActionHandler({ action: 'nexttrack' }, () => nextTrack()).catch(()=>{});
      MediaSession.setActionHandler({ action: 'previoustrack' }, () => prevTrack()).catch(()=>{});

      return;
    }
    
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      // Update lock screen metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'Pandoos Music',
        artwork: [
          { src: currentTrack.albumArt, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.albumArt, sizes: '256x256', type: 'image/jpeg' },
          { src: getBestThumbnail(currentTrack.videoId), sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }

    // Set playback state so OS shows correct play/pause icon
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Hook up hardware media keys
    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    
    // Note: seeking requires passing the seek time to the audio engine, 
    // which is slightly complex with the YT IFrame API wrapper, so we skip it 
    // for MVP lock screen controls.

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [currentTrack, isPlaying, togglePlayPause, nextTrack, prevTrack]);
}
