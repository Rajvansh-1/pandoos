import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { Track } from '@/types/track';
import { STORAGE_KEYS } from '@/utils/constants';

// ─────────────────────────────────────────────
// State & Action Types
// ─────────────────────────────────────────────

interface PlayerState {
  /** Currently loaded track (may be paused) */
  currentTrack: Track | null;
  /** The ordered playback queue */
  queue: Track[];
  /** The pre-shuffle queue — restored when shuffle is turned off */
  originalQueue: Track[];
  /** Index of currentTrack within queue */
  queueIndex: number;
  isPlaying: boolean;
  /** Volume 0–1. Persisted so user doesn't re-set on every launch. */
  volume: number;
  isMuted: boolean;
  /** Loop current track */
  isLooping: boolean;
  isShuffling: boolean;
  /** Playback progress 0–1. NOT persisted (resuming mid-song feels jarring). */
  progress: number;
  /** Track duration in seconds (set by audio engine once video loads) */
  duration: number;
  /** Recently played — capped at 50 */
  history: Track[];
  /** True while YouTube player is loading/buffering */
  isLoading: boolean;
  /** Timestamp when sleep timer will trigger, or null if inactive */
  sleepTimerEnd: number | null;
}

interface PlayerActions {
  /**
   * Primary play action. Replaces the queue with `queue` (or a single-track
   * queue if omitted) and starts from `track`.
   */
  playTrack: (track: Track, queue?: Track[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  /**
   * Seek to a position. progress is 0–1.
   * The actual seek is performed by the audio engine hook which watches this value.
   */
  seekTo: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  /** Add a track to the end of the current queue */
  addToQueue: (track: Track) => void;
  /** Add multiple tracks to the end of the current queue without altering queueIndex */
  addTracksToQueue: (tracks: Track[]) => void;
  /** Remove track at queue position `index` */
  removeFromQueue: (index: number) => void;
  /** Replace the entire queue with a new one */
  replaceQueue: (queue: Track[]) => void;
  /** Move a track in the queue (for drag-to-reorder) */
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  /**
   * Inject recommended tracks right after the currently playing track.
   * Skips duplicates already in the queue.
   */
  prependToQueue: (tracks: Track[]) => void;
  // ── Internal setters used only by the audio engine hook ──
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  replaceCurrentTrack: (track: Track) => void;
  // ── Sleep Timer ──
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

// ─────────────────────────────────────────────
// Fisher-Yates shuffle — pure function, no mutation of original
// ─────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Safe non-null assertion: indices are always in bounds here
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [copy[i]!, copy[j]!] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const MAX_HISTORY = 50;

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

/**
 * usePlayerStore — Central music player state.
 *
 * Architecture notes:
 * - Uses Immer middleware so state mutations are written imperatively
 *   but produce immutable updates. This prevents the subtle bugs that
 *   come from accidentally mutating arrays (e.g., queue.push).
 * - Uses persist middleware to save volume + history to localStorage.
 *   Progress is NOT persisted — resuming mid-song is jarring UX.
 * - This store is NEVER directly imported by UI components for audio control.
 *   Components call store actions; the useAudioEngine hook reacts to
 *   store changes and drives the actual YouTube IFrame player.
 */
export const usePlayerStore = create<PlayerStore>()(
  persist(
    immer((set, get) => ({
      // ── Initial State ──
      currentTrack: null,
      queue: [],
      originalQueue: [],
      queueIndex: -1,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      isLooping: false,
      isShuffling: false,
      progress: 0,
      duration: 0,
      history: [],
      isLoading: false,
      sleepTimerEnd: null,

      // ── Actions ──

      playTrack: (track, queue) => {
        set((state) => {
          // Build the new queue. If no queue passed, queue is just this track.
          const newQueue = queue ?? [track];
          const trackIndex = newQueue.findIndex((t) => t.id === track.id);
          const startIndex = trackIndex >= 0 ? trackIndex : 0;

          // Push current track to history before switching
          if (state.currentTrack) {
            state.history = [
              state.currentTrack,
              ...state.history.filter((t) => t.id !== state.currentTrack!.id),
            ].slice(0, MAX_HISTORY);
          }

          state.currentTrack = track;
          state.originalQueue = newQueue;

          if (state.isShuffling) {
            // Keep the target track first, shuffle the rest
            const rest = newQueue.filter((t) => t.id !== track.id);
            state.queue = [track, ...shuffleArray(rest)];
            state.queueIndex = 0;
          } else {
            state.queue = newQueue;
            state.queueIndex = startIndex;
          }

          state.isPlaying = true;
          state.progress = 0;
          state.duration = 0;
          state.isLoading = true;
        });
      },

      pauseTrack: () => {
        set((state) => { state.isPlaying = false; });
      },

      resumeTrack: () => {
        set((state) => { state.isPlaying = true; });
      },

      togglePlayPause: () => {
        const { isPlaying, currentTrack } = get();
        if (!currentTrack) return;
        set((state) => { state.isPlaying = !isPlaying; });
      },

      nextTrack: () => {
        set((state) => {
          const { queue, queueIndex, isLooping } = state;
          if (isLooping) {
            // Restart current track — audio engine reacts to progress reset
            state.progress = 0;
            state.isPlaying = true;
            return;
          }
          const nextIndex = queueIndex + 1;
          if (nextIndex >= queue.length) {
            // End of queue — stop playback
            state.isPlaying = false;
            return;
          }
          const nextTrack = queue[nextIndex];
          if (!nextTrack) return;

          if (state.currentTrack) {
            state.history = [state.currentTrack, ...state.history].slice(0, MAX_HISTORY);
          }
          state.currentTrack = nextTrack;
          state.queueIndex = nextIndex;
          state.progress = 0;
          state.duration = 0;
          state.isLoading = true;
          state.isPlaying = true;
        });
      },

      prevTrack: () => {
        set((state) => {
          // If more than 3 seconds in: restart current track
          if (state.progress * state.duration > 3) {
            state.progress = 0;
            state.isPlaying = true;
            return;
          }
          const prevIndex = state.queueIndex - 1;
          if (prevIndex < 0) {
            state.progress = 0;
            return;
          }
          const prevTrack = state.queue[prevIndex];
          if (!prevTrack) return;

          state.currentTrack = prevTrack;
          state.queueIndex = prevIndex;
          state.progress = 0;
          state.duration = 0;
          state.isLoading = true;
          state.isPlaying = true;
        });
      },

      seekTo: (progress) => {
        set((state) => { state.progress = progress; });
      },

      setVolume: (volume) => {
        set((state) => {
          state.volume = Math.max(0, Math.min(1, volume));
          state.isMuted = volume === 0;
        });
      },

      toggleMute: () => {
        set((state) => { state.isMuted = !state.isMuted; });
      },

      toggleLoop: () => {
        set((state) => { state.isLooping = !state.isLooping; });
      },

      toggleShuffle: () => {
        set((state) => {
          if (!state.isShuffling) {
            // Enable shuffle: keep current track first, shuffle the rest
            const rest = state.queue.filter((_, i) => i !== state.queueIndex);
            const shuffled = [state.queue[state.queueIndex]!, ...shuffleArray(rest)].filter(Boolean);
            state.queue = shuffled;
            state.queueIndex = 0;
          } else {
            // Disable shuffle: restore original queue, find current track position
            state.queue = state.originalQueue;
            const idx = state.originalQueue.findIndex((t) => t.id === state.currentTrack?.id);
            state.queueIndex = idx >= 0 ? idx : 0;
          }
          state.isShuffling = !state.isShuffling;
        });
      },

      addToQueue: (track) => {
        set((state) => {
          state.queue.push(track);
          state.originalQueue.push(track);
        });
      },

      addTracksToQueue: (tracks) => {
        set((state) => {
          const existingIds = new Set(state.queue.map(t => t.videoId));
          const fresh = tracks.filter(t => !existingIds.has(t.videoId));
          if (fresh.length === 0) return;
          state.queue.push(...fresh);
          state.originalQueue.push(...fresh);
        });
      },

      removeFromQueue: (index) => {
        set((state) => {
          state.queue.splice(index, 1);
          state.originalQueue = state.originalQueue.filter(
            (t) => t.id !== state.queue[index]?.id
          );
          // Adjust index if we removed a track before the current one
          if (index < state.queueIndex) {
            state.queueIndex -= 1;
          }
        });
      },

      replaceQueue: (newQueue) => {
        set((state) => {
          state.queue = newQueue;
          state.originalQueue = newQueue;
        });
      },

      reorderQueue: (fromIndex, toIndex) => {
        set((state) => {
          const [moved] = state.queue.splice(fromIndex, 1);
          if (moved) state.queue.splice(toIndex, 0, moved);

          // Update queueIndex to follow the current track after reorder
          state.queueIndex = state.queue.findIndex((t) => t.id === state.currentTrack?.id);
        });
      },

      clearQueue: () => {
        set((state) => {
          state.queue = state.currentTrack ? [state.currentTrack] : [];
          state.originalQueue = state.queue;
          state.queueIndex = 0;
        });
      },

      prependToQueue: (tracks) => {
        set((state) => {
          const existingIds = new Set(state.queue.map(t => t.videoId));
          const fresh = tracks.filter(t => !existingIds.has(t.videoId));
          if (fresh.length === 0) return;
          // Insert right after the currently playing track
          const insertAt = state.queueIndex + 1;
          state.queue.splice(insertAt, 0, ...fresh);
          state.originalQueue = [...state.queue];
        });
      },

      // ── Internal audio engine setters ──
      setProgress: (progress) => {
        set((state) => { state.progress = progress; });
      },
      setDuration: (duration) => {
        set((state) => { state.duration = duration; });
      },
      setIsPlaying: (isPlaying) => {
        set((state) => { state.isPlaying = isPlaying; });
      },
      setIsLoading: (isLoading) => {
        set((state) => { state.isLoading = isLoading; });
      },
      replaceCurrentTrack: (track) => {
        set((state) => {
          if (state.queueIndex >= 0) {
            state.queue[state.queueIndex] = track;
            const originalIdx = state.originalQueue.findIndex((t) => t.id === state.currentTrack?.id);
            if (originalIdx >= 0) {
               state.originalQueue[originalIdx] = track;
            }
          }
          state.currentTrack = track;
          state.progress = 0;
          state.duration = 0;
          state.isLoading = true;
          state.isPlaying = true;
        });
      },
      setSleepTimer: (minutes) => {
        set((state) => {
          state.sleepTimerEnd = Date.now() + minutes * 60 * 1000;
        });
      },
      clearSleepTimer: () => {
        set((state) => {
          state.sleepTimerEnd = null;
        });
      },
    })),
    {
      name: STORAGE_KEYS.player,
      // Only persist user preferences — not transient playback state
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isLooping: state.isLooping,
        isShuffling: state.isShuffling,
        history: state.history,
      }),
    }
  )
);
