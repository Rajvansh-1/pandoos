// @ts-nocheck
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { PROGRESS_INTERVAL_MS } from '@/utils/constants';
import audioClock from '@/services/audioClock';

/**
 * useAudioEngine — The core bridge between Zustand and the YouTube IFrame API.
 * 
 * Architecture:
 * - This hook mounts EXACTLY ONCE (in App.tsx).
 * - It creates a hidden YouTube IFrame.
 * - It subscribes to usePlayerStore and commands the IFrame.
 * - It listens to IFrame events and updates usePlayerStore.
 * - This decoupled design means UI components NEVER touch the audio directly;
 *   they just call `playTrack()` on the store, and this hook handles the rest.
 */
export function useAudioEngine() {
  const playerRef = useRef<YT.Player | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const timeSyncRafRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // Read state we need to react to
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const progress = usePlayerStore((state) => state.progress);

  // Store actions
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const setIsLoading = usePlayerStore((state) => state.setIsLoading);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const pauseTrack = usePlayerStore((state) => state.pauseTrack);
  
  // Sleep Timer
  const sleepTimerEnd = usePlayerStore((state) => state.sleepTimerEnd);
  const clearSleepTimer = usePlayerStore((state) => state.clearSleepTimer);

  // Gamification
  const recordListenSession = useGamificationStore((state) => state.recordListenSession);

  // Taste signals
  const recordSkip = useTasteStore((state) => state.recordSkip);
  const recordLoveTaste = useTasteStore((state) => state.recordLove);
  const recordPlayTaste = useTasteStore((state) => state.recordPlay);

  // Track time listened for gamification
  const recordSession = (durationSeconds: number) => {
    if (durationSeconds > 5) { // Only count if more than 5s played
      recordListenSession(durationSeconds);
    }
  };

  // 1. Initialize YouTube IFrame API
  useEffect(() => {
    // The script is loaded in index.html. We wait for it to be ready.
    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player-root', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1, // Crucial for iOS WebView background play
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            // Apply initial volume
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
          },
          onStateChange: (event) => {
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                setIsLoading(false);
                setIsPlaying(true);
                setDuration(event.target.getDuration());
                startProgressTracker();
                startTimeSync();
                if (!sessionStartRef.current) {
                  sessionStartRef.current = Date.now();
                }
                break;
              case window.YT.PlayerState.PAUSED:
                setIsPlaying(false);
                stopProgressTracker();
                stopTimeSync();
                if (sessionStartRef.current) {
                  recordSession((Date.now() - sessionStartRef.current) / 1000);
                  sessionStartRef.current = null;
                }
                break;
              case window.YT.PlayerState.ENDED:
                setIsPlaying(false);
                stopProgressTracker();
                stopTimeSync();
                if (sessionStartRef.current) {
                  const listenedMs = Date.now() - sessionStartRef.current;
                  const listenedSec = listenedMs / 1000;
                  recordSession(listenedSec);
                  // Taste signal: if listened < 30s it's a skip
                  const curTrack = usePlayerStore.getState().currentTrack;
                  if (curTrack) {
                    if (listenedSec < 30) {
                      recordSkip(curTrack);
                    } else {
                      recordPlayTaste(curTrack);
                    }
                  }
                  sessionStartRef.current = null;
                }
                nextTrack(); // Auto-advance queue
                break;
              case window.YT.PlayerState.BUFFERING:
                setIsLoading(true);
                break;
            }
          },
          onError: async (event) => {
            console.error('YouTube Player Error:', event.data);
            
            const state = usePlayerStore.getState();
            const curTrack = state.currentTrack;
            
            // 150/101 = embed restricted, 100 = video not found/deleted
            if (curTrack && [150, 101, 100].includes(event.data)) {
              console.log('Video blocked or unavailable. Searching for alternative...');
              
              try {
                // Dynamically import to avoid circular dependencies
                const { searchTracks } = await import('@/services/youtube');
                // Search for an audio/lyric alternative
                const query = `${curTrack.title} ${curTrack.artist} lyrics audio`;
                const alternatives = await searchTracks(query);
                
                // Find first alternative that isn't the current broken ID
                const alt = alternatives.find(t => t.id !== curTrack.id);
                
                if (alt) {
                  console.log('Found alternative track:', alt.title);
                  state.replaceCurrentTrack(alt);
                  return; // Stop here, don't skip!
                }
              } catch (e) {
                console.error('Failed to find alternative track', e);
              }
            }
            
            setIsLoading(false);
            // On unplayable track and no alt found, skip to next to prevent dead lock
            setTimeout(state.nextTrack, 1000);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopProgressTracker();
      stopTimeSync();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ignoreProgressUpdatesRef = useRef<number>(0);

  // 2. Track Progress Tracker & Sleep Timer
  const startProgressTracker = () => {
    stopProgressTracker();
    progressIntervalRef.current = window.setInterval(() => {
      // Check sleep timer first
      const currentSleepTimer = usePlayerStore.getState().sleepTimerEnd;
      if (currentSleepTimer && Date.now() >= currentSleepTimer) {
        usePlayerStore.getState().pauseTrack();
        usePlayerStore.getState().clearSleepTimer();
        return;
      }

      if (Date.now() < ignoreProgressUpdatesRef.current) {
        return; // Temporarily ignore interval updates immediately after a seek to prevent rubber-banding
      }

      if (playerRef.current && typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        if (duration > 0) {
          setProgress(currentTime / duration);
        }
      }
    }, PROGRESS_INTERVAL_MS);
  };

  const stopProgressTracker = () => {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // 2b. High-frequency audio clock — feeds audioClock at rAF rate (~60fps)
  //     This is the source of truth for lyrics sync. It bypasses the 500ms
  //     setInterval and reads getCurrentTime() directly from the IFrame player.
  const startTimeSync = () => {
    stopTimeSync();
    const tick = () => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === 'function' &&
        typeof playerRef.current.getPlayerState === 'function'
      ) {
        const state = playerRef.current.getPlayerState();
        audioClock.isPlaying = state === window.YT?.PlayerState?.PLAYING;
        if (audioClock.isPlaying) {
          audioClock.currentTimeMs = playerRef.current.getCurrentTime() * 1000;
        }
      }
      timeSyncRafRef.current = requestAnimationFrame(tick);
    };
    timeSyncRafRef.current = requestAnimationFrame(tick);
  };

  const stopTimeSync = () => {
    if (timeSyncRafRef.current !== null) {
      cancelAnimationFrame(timeSyncRafRef.current);
      timeSyncRafRef.current = null;
    }
    audioClock.isPlaying = false;
  };

  // 3. React to Track Changes
  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;
    if (typeof playerRef.current.loadVideoById !== 'function') return;
    
    // loadVideoById automatically starts playback.
    playerRef.current.loadVideoById(currentTrack.videoId);
    setIsLoading(true);

    // Smart Queue: Fetch "Up Next" Radio if we are near the end of the queue
    const state = usePlayerStore.getState();
    const currentIndex = state.queue.findIndex((t) => t.id === currentTrack.id);
    
    if (currentIndex >= state.queue.length - 3) {
      import('@/services/youtube').then(({ getRadioTracks }) => {
        getRadioTracks(currentTrack.videoId).then((tracks) => {
          if (tracks.length > 0) {
            usePlayerStore.getState().addTracksToQueue(tracks);
          }
        });
      });
    }
  }, [currentTrack?.videoId]);


  // 5. React to Volume/Mute Changes
  useEffect(() => {
    if (!playerRef.current) return;
    if (typeof playerRef.current.setVolume !== 'function') return;
    
    playerRef.current.setVolume(volume * 100);
    
    if (isMuted) {
      if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
    } else {
      if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
    }
  }, [volume, isMuted]);

  // Handle Play/Pause
  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;
    if (typeof playerRef.current.getPlayerState !== 'function') return;
    
    const state = playerRef.current.getPlayerState();
    
    if (isPlaying && state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
      // Ensure volume is correctly set when resuming
      playerRef.current.setVolume(volume * 100);
      playerRef.current.playVideo();
    } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, currentTrack, volume]);

  // 6. React to UI Seeking
  // We use a ref to track the last programmatic progress so we don't seek loop
  const lastSetProgress = useRef(progress);
  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;
    if (typeof playerRef.current.getDuration !== 'function') return;
    
    // If the difference is large, it was a manual UI seek, not the interval tracker
    if (Math.abs(progress - lastSetProgress.current) > 0.02) {
      const duration = playerRef.current.getDuration();
      if (duration > 0) {
        ignoreProgressUpdatesRef.current = Date.now() + 1000;
        playerRef.current.seekTo(progress * duration, true);
      }
    }
    lastSetProgress.current = progress;
  }, [progress, currentTrack]);
}
