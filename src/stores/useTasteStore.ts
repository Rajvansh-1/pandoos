/**
 * useTasteStore.ts — Persisted user taste profile.
 * Tracks artist/genre affinity, skips, and loved tracks.
 * This is the "who you are as a listener" layer.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Track } from '@/types/track';
import { inferTags } from '@/services/trackGraph';

interface TasteState {
  /** How many times each artist was meaningfully listened to (>30s) */
  artistAffinity: Record<string, number>;
  /** How many times each genre was meaningfully listened to */
  genreAffinity: Record<string, number>;
  /** Mood IDs recently played — last 20 */
  moodHistory: string[];
  /** Video IDs skipped in under 30 seconds — never recommend again */
  skippedIds: string[];
  /** Video IDs listened to >80% — strong positive signal */
  lovedIds: string[];
  /** Last 3 distinct artists played — for "Because you listened to X" rows */
  recentArtists: string[];
  /** The dominant taste summary (computed lazily) */
  topGenres: string[];
  topArtists: string[];
}

interface TasteActions {
  recordLove(track: Track): void;
  recordSkip(track: Track): void;
  recordPlay(track: Track, moodId?: string): void;
  getAffinityScore(track: Track): number;
  isSkipped(videoId: string): boolean;
  resetTaste(): void;
  setTopGenres(genres: string[]): void;
}

type TasteStore = TasteState & TasteActions;

const MAX_SKIPPED = 200;
const MAX_LOVED = 500;
const MAX_RECENT_ARTISTS = 5;

export const useTasteStore = create<TasteStore>()(
  persist(
    immer((set, get) => ({
      artistAffinity: {},
      genreAffinity: {},
      moodHistory: [],
      skippedIds: [],
      lovedIds: [],
      recentArtists: [],
      topGenres: [],
      topArtists: [],

      recordPlay(track, moodId) {
        set(state => {
          const tags = inferTags(track.title, track.artist);
          const artistKey = track.artist.toLowerCase().trim();

          // Bump artist affinity
          state.artistAffinity[artistKey] = (state.artistAffinity[artistKey] ?? 0) + 1;

          // Bump genre affinities
          for (const g of tags.genres) {
            state.genreAffinity[g] = (state.genreAffinity[g] ?? 0) + 1;
          }

          // Update mood history
          if (moodId) {
            state.moodHistory = [moodId, ...state.moodHistory].slice(0, 20);
          }

          // Update recent artists (deduplicated)
          const filtered = state.recentArtists.filter(a => a !== artistKey);
          state.recentArtists = [artistKey, ...filtered].slice(0, MAX_RECENT_ARTISTS);

          // Recompute topGenres
          const sortedGenres = Object.entries(state.genreAffinity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([g]) => g);
          state.topGenres = sortedGenres;

          // Recompute topArtists
          const sortedArtists = Object.entries(state.artistAffinity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([a]) => a);
          state.topArtists = sortedArtists;
        });
      },

      recordLove(track) {
        set(state => {
          if (!state.lovedIds.includes(track.videoId)) {
            state.lovedIds = [track.videoId, ...state.lovedIds].slice(0, MAX_LOVED);
          }
          // Loved = extra affinity boost
          const artistKey = track.artist.toLowerCase().trim();
          state.artistAffinity[artistKey] = (state.artistAffinity[artistKey] ?? 0) + 2;
          const tags = inferTags(track.title, track.artist);
          for (const g of tags.genres) {
            state.genreAffinity[g] = (state.genreAffinity[g] ?? 0) + 2;
          }
        });
      },

      recordSkip(track) {
        set(state => {
          if (!state.skippedIds.includes(track.videoId)) {
            state.skippedIds = [track.videoId, ...state.skippedIds].slice(0, MAX_SKIPPED);
          }
          // Penalize artist slightly
          const artistKey = track.artist.toLowerCase().trim();
          state.artistAffinity[artistKey] = Math.max(0, (state.artistAffinity[artistKey] ?? 0) - 0.5);
        });
      },

      getAffinityScore(track) {
        const state = get();
        const tags = inferTags(track.title, track.artist);
        const artistKey = track.artist.toLowerCase().trim();

        const artistScore = Math.min((state.artistAffinity[artistKey] ?? 0) / 5, 1); // 0–1
        const genreScore = tags.genres.reduce((sum, g) => {
          return sum + Math.min((state.genreAffinity[g] ?? 0) / 10, 1);
        }, 0) / Math.max(tags.genres.length, 1); // 0–1

        const skipPenalty = state.skippedIds.includes(track.videoId) ? -2 : 0;
        const loveBonusVal = state.lovedIds.includes(track.videoId) ? 0.5 : 0;

        return artistScore * 0.5 + genreScore * 0.5 + loveBonusVal + skipPenalty;
      },

      isSkipped(videoId) {
        return get().skippedIds.includes(videoId);
      },

      resetTaste() {
        set(state => {
          state.artistAffinity = {};
          state.genreAffinity = {};
          state.moodHistory = [];
          state.skippedIds = [];
          state.lovedIds = [];
          state.recentArtists = [];
          state.topGenres = [];
          state.topArtists = [];
        });
      },

      setTopGenres(genres) {
        set(state => {
          state.topGenres = genres;
          // Seed genre affinity so recommendations work immediately
          genres.forEach(g => {
            state.genreAffinity[g] = 5;
          });
        });
      },
    })),
    {
      name: 'pandoos-taste-v1',
    }
  )
);
