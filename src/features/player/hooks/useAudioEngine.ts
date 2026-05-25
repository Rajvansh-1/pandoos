// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { PROGRESS_INTERVAL_MS } from '@/utils/constants';
import audioClock from '@/services/audioClock';
import { getTrackBlob } from '@/services/offlineDB';

/**
 * useAudioEngine — Dual Engine Architecture (YouTube IFrame + HTML5 Audio)
 */
export function useAudioEngine() {
  const playerRef = useRef<YT.Player | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const activeEngineRef = useRef<'youtube' | 'local'>('youtube');

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

  // Gamification & Taste
  const recordListenSession = useGamificationStore((state) => state.recordListenSession);
  const recordSkip = useTasteStore((state) => state.recordSkip);
  const recordLoveTaste = useTasteStore((state) => state.recordLove);
  const recordPlayTaste = useTasteStore((state) => state.recordPlay);

  const recordSession = (durationSeconds: number) => {
    if (durationSeconds > 5) {
      recordListenSession(durationSeconds);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    stopProgressTracker();
    stopTimeSync();
    if (sessionStartRef.current) {
      const listenedMs = Date.now() - sessionStartRef.current;
      const listenedSec = listenedMs / 1000;
      recordSession(listenedSec);
      
      const curTrack = usePlayerStore.getState().currentTrack;
      if (curTrack) {
        if (listenedSec < 30) recordSkip(curTrack);
        else recordPlayTaste(curTrack);
      }
      sessionStartRef.current = null;
    }
    nextTrack();
  };

  // 1. Initialize Engines
  useEffect(() => {
    // A. Init HTML5 Audio (Offline Engine)
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.oncanplay = () => {
      if (activeEngineRef.current === 'local') {
        setIsLoading(false);
        setDuration(audioRef.current?.duration || 0);
        if (usePlayerStore.getState().isPlaying) {
          audioRef.current?.play().catch(console.error);
        }
      }
    };
    audioRef.current.onplay = () => {
      if (activeEngineRef.current === 'local') {
        setIsPlaying(true);
        startProgressTracker();
        startTimeSync();
        if (!sessionStartRef.current) sessionStartRef.current = Date.now();
      }
    };
    audioRef.current.onpause = () => {
      if (activeEngineRef.current === 'local') {
        setIsPlaying(false);
        stopProgressTracker();
        stopTimeSync();
        if (sessionStartRef.current) {
          recordSession((Date.now() - sessionStartRef.current) / 1000);
          sessionStartRef.current = null;
        }
      }
    };
    audioRef.current.onended = () => {
      if (activeEngineRef.current === 'local') handleEnded();
    };

    // B. Init YouTube IFrame (Online Engine)
    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player-root', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (event) => {
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
          },
          onStateChange: (event) => {
            if (activeEngineRef.current !== 'youtube') return;
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                setIsLoading(false);
                setIsPlaying(true);
                setDuration(event.target.getDuration());
                startProgressTracker();
                startTimeSync();
                if (!sessionStartRef.current) sessionStartRef.current = Date.now();
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
                handleEnded();
                break;
              case window.YT.PlayerState.BUFFERING:
                setIsLoading(true);
                break;
            }
          },
          onError: async (event) => {
            if (activeEngineRef.current !== 'youtube') return;
            console.error('YouTube Player Error:', event.data);
            const state = usePlayerStore.getState();
            const current = state.currentTrack;
            if (!current) {
              setIsLoading(false);
              setTimeout(state.nextTrack, 1000);
              return;
            }

            // Error 150/101 indicates the video is blocked from embedding.
            // Instead of skipping and playing the wrong song, fallback to the backend proxy stream!
            console.log('Falling back to proxy audio stream for', current.videoId);
            activeEngineRef.current = 'local';
            if (audioRef.current) {
              audioRef.current.src = `/api/download?videoId=${current.videoId}`;
              audioRef.current.load();
              if (state.isPlaying) audioRef.current.play().catch(console.error);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      stopProgressTracker();
      stopTimeSync();
      if (playerRef.current) playerRef.current.destroy();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const ignoreProgressUpdatesRef = useRef<number>(0);

  // 2. Track Progress Tracker
  const startProgressTracker = () => {
    stopProgressTracker();
    progressIntervalRef.current = window.setInterval(() => {
      const currentSleepTimer = usePlayerStore.getState().sleepTimerEnd;
      if (currentSleepTimer && Date.now() >= currentSleepTimer) {
        usePlayerStore.getState().pauseTrack();
        usePlayerStore.getState().clearSleepTimer();
        return;
      }

      if (Date.now() < ignoreProgressUpdatesRef.current) return;

      if (activeEngineRef.current === 'local') {
        if (audioRef.current && !audioRef.current.paused && audioRef.current.duration > 0) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      } else {
        if (playerRef.current?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
          const duration = playerRef.current.getDuration();
          if (duration > 0) setProgress(playerRef.current.getCurrentTime() / duration);
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

  // 2b. High-frequency audio clock for Lyrics Sync (Interpolated for flawless 1ms precision)
  const startTimeSync = () => {
    stopTimeSync();
    
    let lastReportedTime = -1;
    let lastUpdateTs = performance.now();

    const tick = (ts: number) => {
      if (activeEngineRef.current === 'local') {
        if (audioRef.current) {
          audioClock.isPlaying = !audioRef.current.paused;
          if (audioClock.isPlaying) {
            const reportedTime = audioRef.current.currentTime * 1000;
            if (reportedTime !== lastReportedTime) {
              lastReportedTime = reportedTime;
              lastUpdateTs = ts;
              audioClock.currentTimeMs = reportedTime;
            } else {
              // Interpolate for perfect smoothness between updates
              audioClock.currentTimeMs = lastReportedTime + (ts - lastUpdateTs);
            }
          }
        }
      } else {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getPlayerState) {
          audioClock.isPlaying = playerRef.current.getPlayerState() === window.YT?.PlayerState?.PLAYING;
          if (audioClock.isPlaying) {
            const reportedTime = playerRef.current.getCurrentTime() * 1000;
            if (reportedTime !== lastReportedTime) {
              lastReportedTime = reportedTime;
              lastUpdateTs = ts;
              audioClock.currentTimeMs = reportedTime;
            } else {
              // YouTube IFrame API only updates time every 100-250ms. 
              // We MUST interpolate here otherwise lyrics will stutter and lag.
              audioClock.currentTimeMs = lastReportedTime + (ts - lastUpdateTs);
            }
          }
        }
      }
      timeSyncRafRef.current = requestAnimationFrame(tick);
    };
    timeSyncRafRef.current = requestAnimationFrame(tick);
  };

  const stopTimeSync = () => {
    if (timeSyncRafRef.current !== null) cancelAnimationFrame(timeSyncRafRef.current);
    audioClock.isPlaying = false;
  };

  // 3. React to Track Changes (Dual Engine Switcher)
  useEffect(() => {
    if (!currentTrack) return;
    
    setIsLoading(true);

    getTrackBlob(currentTrack.videoId).then((blob) => {
      // CRITICAL FIX: Prevent race conditions if the user rapidly clicks multiple songs.
      // If the current track in the store has changed since we started fetching, abort.
      if (usePlayerStore.getState().currentTrack?.videoId !== currentTrack.videoId) return;

      if (blob) {
        // Switch to Offline Engine
        activeEngineRef.current = 'local';
        if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
        
        if (audioRef.current) {
          // Free memory of old blob url
          if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          audioRef.current.src = URL.createObjectURL(blob);
          audioRef.current.load();
          if (isPlaying) audioRef.current.play().catch(console.error);
        }
      } else {
        // Switch to Online Engine (YouTube)
        activeEngineRef.current = 'youtube';
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        
        if (playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById(currentTrack.videoId);
        }
      }
      
      // Smart Queue
      const state = usePlayerStore.getState();
      const currentIndex = state.queue.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex >= state.queue.length - 3) {
        import('@/services/youtube').then(({ getRadioTracks }) => {
          getRadioTracks(currentTrack.videoId).then((tracks) => {
            if (tracks.length > 0) usePlayerStore.getState().addTracksToQueue(tracks);
          });
        });
      }
    });
  }, [currentTrack?.videoId]);

  // 5. React to Volume/Mute Changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(volume * 100);
      if (isMuted) playerRef.current.mute?.();
      else playerRef.current.unMute?.();
    }
  }, [volume, isMuted]);

  // Handle Play/Pause
  useEffect(() => {
    if (!currentTrack) return;
    
    if (activeEngineRef.current === 'local') {
      if (audioRef.current) {
        if (isPlaying && audioRef.current.paused) audioRef.current.play().catch(console.error);
        else if (!isPlaying && !audioRef.current.paused) audioRef.current.pause();
      }
    } else {
      if (playerRef.current?.getPlayerState) {
        const state = playerRef.current.getPlayerState();
        if (isPlaying && state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
          playerRef.current.playVideo();
        } else if (!isPlaying && state === window.YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo();
        }
      }
    }
  }, [isPlaying, currentTrack]);

  // 6. React to UI Seeking
  const lastSetProgress = useRef(progress);
  useEffect(() => {
    if (!currentTrack) return;
    
    if (Math.abs(progress - lastSetProgress.current) > 0.02) {
      ignoreProgressUpdatesRef.current = Date.now() + 1000;
      
      if (activeEngineRef.current === 'local') {
        if (audioRef.current && audioRef.current.duration > 0) {
          audioRef.current.currentTime = progress * audioRef.current.duration;
        }
      } else {
        if (playerRef.current?.getDuration) {
          const duration = playerRef.current.getDuration();
          if (duration > 0) playerRef.current.seekTo(progress * duration, true);
        }
      }
    }
    lastSetProgress.current = progress;
  }, [progress, currentTrack]);
}
