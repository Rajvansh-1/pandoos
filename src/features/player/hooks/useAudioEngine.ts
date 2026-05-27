// @ts-nocheck
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { PROGRESS_INTERVAL_MS } from '@/utils/constants';
import audioClock from '@/services/audioClock';
import { getTrackBlob } from '@/services/offlineDB';

/**
 * useAudioEngine — Dual Engine Architecture (YouTube IFrame + HTML5 Audio)
 *
 * KEY ARCHITECTURE NOTE:
 *
 * React.StrictMode (used in main.tsx) mounts every component TWICE in dev.
 * This means the one-time useEffect([], []) runs, gets cleaned up, then runs
 * again. The old pattern of setting window.onYouTubeIframeAPIReady inside the
 * effect was broken by this: cleanup destroyed the callback, and the second
 * mount re-set it — but by then the API may have already fired.
 *
 * FIX: We use a single module-level YT player instance. The instance is
 * created once at module load time and survives React StrictMode double-mounts.
 * The React hook just reads from this shared instance via refs.
 *
 * FIRST-SONG BUG FIXES (original bugs):
 *   1. ytReadyRef — guard all player commands until onReady fires
 *   2. pendingPlayRef — store intent when player not ready; apply in onReady
 *   3. isLoading safety net — 8-second timeout clears stuck spinner
 *   4. Progress tracker accepts state 3 (BUFFERING) not just state 1 (PLAYING)
 */

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL singleton — survives React StrictMode double-mounts
// ─────────────────────────────────────────────────────────────────────────────
let _ytPlayer: YT.Player | null = null;
let _ytReady = false;
let _ytInitDone = false;
let _activeDelegate: {
  onReady: (event: YT.PlayerEvent) => void;
  onStateChange: (event: YT.OnStateChangeEvent) => void;
  onError: (event: YT.OnErrorEvent) => void;
} | null = null;

function getOrCreateYTPlayer(
  onReady: (event: YT.PlayerEvent) => void,
  onStateChange: (event: YT.OnStateChangeEvent) => void,
  onError: (event: YT.OnErrorEvent) => void,
): void {
  if (_ytInitDone) return; // already creating or created
  _ytInitDone = true;

  const create = () => {
    if (!window.YT?.Player) return;
    console.log('[🐼 AudioEngine] Creating YT Player singleton...');
    _ytPlayer = new window.YT.Player('yt-player-root', {
      height: '200',
      width: '200',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => _activeDelegate?.onReady(e),
        onStateChange: (e) => _activeDelegate?.onStateChange(e),
        onError: (e) => _activeDelegate?.onError(e),
      },
    });
  };

  if (window.YT?.Player) {
    create();
  } else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      create();
    };
  }
}

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeEngineRef = useRef<'youtube' | 'local'>('youtube');

  const progressIntervalRef = useRef<number | null>(null);
  const timeSyncRafRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const ignoreProgressUpdatesRef = useRef<number>(0);

  const pendingPlayRef = useRef(false);
  const loadingTimeoutRef = useRef<number | null>(null);

  const seekVersion = usePlayerStore((state) => state.seekVersion);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);

  // ── Helper functions in a ref so YT closures are never stale ─────────────
  const fnsRef = useRef<{
    startProgressTracker: () => void;
    stopProgressTracker: () => void;
    startTimeSync: () => void;
    stopTimeSync: () => void;
    handleEnded: () => void;
  }>({
    startProgressTracker: () => {},
    stopProgressTracker: () => {},
    startTimeSync: () => {},
    stopTimeSync: () => {},
    handleEnded: () => {},
  });

  const stopProgressTracker = () => {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressTracker = () => {
    stopProgressTracker();
    progressIntervalRef.current = window.setInterval(() => {
      const storeState = usePlayerStore.getState();
      if (storeState.sleepTimerEnd && Date.now() >= storeState.sleepTimerEnd) {
        storeState.pauseTrack();
        storeState.clearSleepTimer();
        return;
      }
      if (Date.now() < ignoreProgressUpdatesRef.current) return;

      if (activeEngineRef.current === 'local') {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          const d = audio.duration;
          if (d > 0 && Number.isFinite(d)) {
            if (usePlayerStore.getState().duration === 0) usePlayerStore.getState().setDuration(d);
            usePlayerStore.getState().setProgress(audio.currentTime / d);
          }
        }
      } else {
        if (_ytPlayer && _ytPlayer.getPlayerState) {
          try {
            const ps = _ytPlayer.getPlayerState();
            // Accept PLAYING (1) OR BUFFERING (3) — keep UI alive during buffer stalls
            if (ps === 1 || ps === 3) {
              const d = _ytPlayer.getDuration();
              if (d > 0 && Number.isFinite(d)) {
                if (usePlayerStore.getState().duration === 0) usePlayerStore.getState().setDuration(d);
                usePlayerStore.getState().setProgress(_ytPlayer.getCurrentTime() / d);
              }
            }
          } catch(e) {}
        }
      }
    }, PROGRESS_INTERVAL_MS);
  };

  const stopTimeSync = () => {
    if (timeSyncRafRef.current !== null) {
      cancelAnimationFrame(timeSyncRafRef.current);
      timeSyncRafRef.current = null;
    }
    audioClock.isPlaying = false;
  };

  const startTimeSync = () => {
    stopTimeSync();
    let lastReportedTime = -1;
    let lastUpdateTs = performance.now();
    const tick = (ts: number) => {
      if (activeEngineRef.current === 'local') {
        const audio = audioRef.current;
        if (audio) {
          audioClock.isPlaying = !audio.paused;
          if (audioClock.isPlaying) {
            const t = audio.currentTime * 1000;
            if (t !== lastReportedTime) { lastReportedTime = t; lastUpdateTs = ts; audioClock.currentTimeMs = t; }
            else { audioClock.currentTimeMs = lastReportedTime + (ts - lastUpdateTs); }
          }
        }
      } else {
        if (_ytPlayer && _ytPlayer.getCurrentTime && _ytPlayer.getPlayerState) {
          try {
            audioClock.isPlaying = _ytPlayer.getPlayerState() === 1;
            if (audioClock.isPlaying) {
              const t = _ytPlayer.getCurrentTime() * 1000;
              if (t !== lastReportedTime) { lastReportedTime = t; lastUpdateTs = ts; audioClock.currentTimeMs = t; }
              else { audioClock.currentTimeMs = lastReportedTime + (ts - lastUpdateTs); }
            }
          } catch(e) {}
        }
      }
      timeSyncRafRef.current = requestAnimationFrame(tick);
    };
    timeSyncRafRef.current = requestAnimationFrame(tick);
  };

  const handleEnded = () => {
    usePlayerStore.getState().setIsPlaying(false);
    stopProgressTracker();
    stopTimeSync();
    if (sessionStartRef.current) {
      const listenedSec = (Date.now() - sessionStartRef.current) / 1000;
      if (listenedSec > 5) useGamificationStore.getState().recordListenSession(listenedSec);
      const curTrack = usePlayerStore.getState().currentTrack;
      if (curTrack) {
        if (listenedSec < 30) useTasteStore.getState().recordSkip(curTrack);
        else useTasteStore.getState().recordPlay(curTrack);
      }
      sessionStartRef.current = null;
    }
    usePlayerStore.getState().nextTrack();
  };

  // Keep fnsRef up to date every render
  useEffect(() => {
    fnsRef.current = { startProgressTracker, stopProgressTracker, startTimeSync, stopTimeSync, handleEnded };
  });

  // ── 1. ONE-TIME ENGINE INIT ───────────────────────────────────────────────
  useEffect(() => {
    // A. HTML5 Audio
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.oncanplay = () => {
      if (activeEngineRef.current !== 'local') return;
      usePlayerStore.getState().setIsLoading(false);
      const d = audio.duration;
      if (d > 0 && Number.isFinite(d)) usePlayerStore.getState().setDuration(d);
      if (usePlayerStore.getState().isPlaying) audio.play().catch(console.error);
    };
    audio.onplay = () => {
      if (activeEngineRef.current !== 'local') return;
      usePlayerStore.getState().setIsLoading(false);
      usePlayerStore.getState().setIsPlaying(true);
      fnsRef.current.startProgressTracker();
      fnsRef.current.startTimeSync();
      if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    };
    audio.onpause = () => {
      if (activeEngineRef.current !== 'local') return;
      usePlayerStore.getState().setIsPlaying(false);
      fnsRef.current.stopProgressTracker();
      fnsRef.current.stopTimeSync();
      if (sessionStartRef.current) {
        const secs = (Date.now() - sessionStartRef.current) / 1000;
        if (secs > 5) useGamificationStore.getState().recordListenSession(secs);
        sessionStartRef.current = null;
      }
    };
    audio.onended = () => {
      if (activeEngineRef.current === 'local') fnsRef.current.handleEnded();
    };

    // B. YouTube IFrame — register our active delegate
    _activeDelegate = {
      onReady: (event) => {
        console.log('[🐼 AudioEngine] YT Player onReady fired ✅');
        _ytReady = true;

        if (loadingTimeoutRef.current !== null) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        const vol = usePlayerStore.getState().volume;
        const muted = usePlayerStore.getState().isMuted;
        event.target.setVolume(vol * 100);
        if (muted) event.target.mute();

        try {
          const iframe = document.querySelector('#yt-player-root iframe') as HTMLIFrameElement;
          if (iframe) iframe.setAttribute('tabindex', '-1');
        } catch (_) {}

        const state = usePlayerStore.getState();
        const track = state.currentTrack;
        console.log('[🐼 AudioEngine] onReady — currentTrack:', track?.title, '| isPlaying:', state.isPlaying, '| pending:', pendingPlayRef.current);
        if (track && activeEngineRef.current === 'youtube') {
          if (pendingPlayRef.current || state.isPlaying) {
            pendingPlayRef.current = false;
            console.log('[🐼 AudioEngine] onReady → loadVideoById:', track.videoId);
            event.target.loadVideoById(track.videoId);
          } else {
            usePlayerStore.getState().setIsLoading(false);
          }
        } else {
          usePlayerStore.getState().setIsLoading(false);
        }
      },
      onStateChange: (event) => {
        console.log('[🐼 AudioEngine] onStateChange:', event.data, '(1=PLAYING, 2=PAUSED, 3=BUFFERING, 0=ENDED, -1=UNSTARTED, 5=CUED)');
        if (activeEngineRef.current !== 'youtube') return;
        switch (event.data) {
          case window.YT.PlayerState.PLAYING: {
            usePlayerStore.getState().setIsLoading(false);
            usePlayerStore.getState().setIsPlaying(true);
            pendingPlayRef.current = false;
            const dur = event.target.getDuration();
            if (dur > 0 && Number.isFinite(dur)) usePlayerStore.getState().setDuration(dur);
            fnsRef.current.startProgressTracker();
            fnsRef.current.startTimeSync();
            if (!sessionStartRef.current) sessionStartRef.current = Date.now();
            break;
          }
          case window.YT.PlayerState.PAUSED: {
            usePlayerStore.getState().setIsLoading(false);
            usePlayerStore.getState().setIsPlaying(false);
            fnsRef.current.stopProgressTracker();
            fnsRef.current.stopTimeSync();
            if (sessionStartRef.current) {
              const secs = (Date.now() - sessionStartRef.current) / 1000;
              if (secs > 5) useGamificationStore.getState().recordListenSession(secs);
              sessionStartRef.current = null;
            }
            break;
          }
          case window.YT.PlayerState.CUED:
          case window.YT.PlayerState.UNSTARTED: {
            usePlayerStore.getState().setIsLoading(false);
            break;
          }
          case window.YT.PlayerState.ENDED: {
            fnsRef.current.handleEnded();
            break;
          }
          case window.YT.PlayerState.BUFFERING: {
            usePlayerStore.getState().setIsLoading(true);
            break;
          }
        }
      },
      onError: async (event) => {
        if (activeEngineRef.current !== 'youtube') return;
        console.error('YouTube Player Error:', event.data);
        const state = usePlayerStore.getState();
        const current = state.currentTrack;
        if (!current) { state.setIsLoading(false); setTimeout(state.nextTrack, 1000); return; }
        console.log('Falling back to proxy stream for', current.videoId);
        activeEngineRef.current = 'local';
        const a = audioRef.current;
        if (a) {
          a.src = `/api/download?videoId=${current.videoId}`;
          a.load();
          if (state.isPlaying) a.play().catch(console.error);
        }
      }
    };

    getOrCreateYTPlayer(
      (e) => _activeDelegate?.onReady(e),
      (e) => _activeDelegate?.onStateChange(e),
      (e) => _activeDelegate?.onError(e)
    );

    // If we're mounting and the player is ALREADY ready, simulate onReady for this instance
    // so it catches up with the global state (e.g., if a track was already playing)
    if (_ytReady && _ytPlayer) {
       _activeDelegate.onReady({ target: _ytPlayer } as YT.PlayerEvent);
    }

    return () => {
      _activeDelegate = null;
      fnsRef.current.stopProgressTracker();
      fnsRef.current.stopTimeSync();
      if (loadingTimeoutRef.current !== null) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      // NOTE: Do NOT destroy the YT player on cleanup — it's a module-level singleton.
      // Only stop the HTML5 audio.
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ── 2. TRACK CHANGE ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    if (typeof window !== 'undefined' && (window as any).electronAPI?.notifySongChange) {
      (window as any).electronAPI.notifySongChange(currentTrack);
    }

    usePlayerStore.getState().setIsLoading(true);

    // Safety net: force-clear isLoading after 8s if player events never fire
    if (loadingTimeoutRef.current !== null) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = window.setTimeout(() => {
      loadingTimeoutRef.current = null;
      if (usePlayerStore.getState().isLoading) {
        console.warn('[AudioEngine] Loading timeout — force-clearing isLoading');
        usePlayerStore.getState().setIsLoading(false);
      }
    }, 8000);

    // ── EAGER YOUTUBE LOAD (bypasses async user-gesture expiration) ──
    // We must call loadVideoById immediately so the browser's transient activation
    // (user gesture) is still valid. If we wait for IndexedDB (getTrackBlob),
    // the browser blocks autoplay!
    activeEngineRef.current = 'youtube';
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }

    if (_ytReady && _ytPlayer) {
      console.log('[🐼 AudioEngine] EAGER Track change → loadVideoById:', currentTrack.videoId);
      _ytPlayer.loadVideoById(currentTrack.videoId);
    } else {
      console.log('[🐼 AudioEngine] Track change — player not ready yet, setting pendingPlay:', usePlayerStore.getState().isPlaying);
      pendingPlayRef.current = usePlayerStore.getState().isPlaying;
    }

    // ── CHECK OFFLINE STORAGE ──
    getTrackBlob(currentTrack.videoId).then((blob) => {
      if (usePlayerStore.getState().currentTrack?.videoId !== currentTrack.videoId) return;

      if (blob) {
        console.log('[🐼 AudioEngine] Found offline blob — switching to local engine');
        activeEngineRef.current = 'local';
        if (_ytReady && _ytPlayer) _ytPlayer.pauseVideo(); // pause the eager YT load
        
        if (audio) {
          if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src);
          audio.src = URL.createObjectURL(blob);
          audio.load();
          if (usePlayerStore.getState().isPlaying) audio.play().catch(console.error);
        }
      }

      // Smart Queue auto-extend
      const state = usePlayerStore.getState();
      const idx = state.queue.findIndex((t) => t.id === currentTrack.id);
      if (idx >= state.queue.length - 3) {
        import('@/services/youtube').then(({ getRadioTracks }) => {
          getRadioTracks(currentTrack.videoId).then((tracks) => {
            if (tracks.length > 0) usePlayerStore.getState().addTracksToQueue(tracks);
          });
        });
      }
    }).catch((err) => {
      console.error('Error fetching track blob:', err);
    });
  }, [currentTrack?.videoId]);

  // ── 3. VOLUME / MUTE ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.volume = volume; audio.muted = isMuted; }
    if (_ytReady && _ytPlayer?.setVolume) {
      _ytPlayer.setVolume(volume * 100);
      isMuted ? _ytPlayer.mute?.() : _ytPlayer.unMute?.();
    }
  }, [volume, isMuted]);

  // ── 4. PLAY / PAUSE ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    // FAILSAFE: ensure tracker always reflects isPlaying state.
    // This covers edge cases where onStateChange PLAYING is missed.
    if (isPlaying) {
      fnsRef.current.startProgressTracker();
      fnsRef.current.startTimeSync();
    } else {
      fnsRef.current.stopProgressTracker();
      fnsRef.current.stopTimeSync();
    }

    if (activeEngineRef.current === 'local') {
      const audio = audioRef.current;
      if (audio) {
        if (isPlaying && audio.paused) audio.play().catch(console.error);
        else if (!isPlaying && !audio.paused) audio.pause();
      }
    } else {
      if (!_ytReady) {
        pendingPlayRef.current = isPlaying;
        return;
      }

      if (_ytPlayer?.getPlayerState) {
        try {
          const state = _ytPlayer.getPlayerState();
          // -1=UNSTARTED, 0=ENDED, 1=PLAYING, 2=PAUSED, 3=BUFFERING, 5=CUED
          if (isPlaying && state !== 1 && state !== 3) {
            _ytPlayer.playVideo();
          } else if (!isPlaying && (state === 1 || state === 3)) {
            _ytPlayer.pauseVideo();
          }
        } catch(e) {}
      }
    }
  }, [isPlaying, currentTrack]);

  // ── 5. USER SEEK ──────────────────────────────────────────────────────────
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    if (!usePlayerStore.getState().currentTrack) return;

    const targetProgress = usePlayerStore.getState().progress;
    ignoreProgressUpdatesRef.current = Date.now() + 1500;

    const applySeek = () => {
      if (activeEngineRef.current === 'local') {
        const audio = audioRef.current;
        if (!audio) return;
        const d = audio.duration;
        if (d > 0 && Number.isFinite(d)) {
          audio.currentTime = targetProgress * d;
        } else {
          const retry = () => {
            const dur = audioRef.current?.duration;
            if (dur && dur > 0 && Number.isFinite(dur)) audioRef.current!.currentTime = targetProgress * dur;
          };
          audio.addEventListener('canplay', retry, { once: true });
          audio.addEventListener('durationchange', retry, { once: true });
        }
      } else {
        if (!_ytReady || !_ytPlayer) return;
        const d = _ytPlayer.getDuration?.();
        if (d && d > 0 && Number.isFinite(d)) {
          _ytPlayer.seekTo(targetProgress * d, true);
        } else {
          let attempts = 0;
          const retry = () => {
            const dur = _ytPlayer?.getDuration?.();
            if (dur && dur > 0 && Number.isFinite(dur)) _ytPlayer?.seekTo(targetProgress * dur, true);
            else if (++attempts < 10) setTimeout(retry, 300);
          };
          setTimeout(retry, 300);
        }
      }
    };
    applySeek();
  }, [seekVersion]);
}
