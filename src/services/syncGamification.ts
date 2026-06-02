import { supabase } from '@/services/supabase';
import { useGamificationStore } from '@/stores/useGamificationStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

let syncChannel: RealtimeChannel | null = null;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncingFromServer = false;

/**
 * Uploads the local gamification state to Supabase.
 * Debounced to avoid spamming the database on rapid state changes.
 */
export function pushGamificationState(userId: string) {
  if (isSyncingFromServer) return; // Prevent echoing back to server
  
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const state = useGamificationStore.getState();
      
      // Extract only the serializable gamification data (exclude actions and pendingReveals)
      const dataToSync = {
        listenMinutes: state.listenMinutes,
        streakDays: state.streakDays,
        longestStreak: state.longestStreak,
        lastListenDate: state.lastListenDate,
        likedSongs: state.likedSongs,
        favoriteMoods: state.favoriteMoods,
        earnedBadges: state.earnedBadges,
        nightOwlSessions: state.nightOwlSessions,
        earlyBirdSessions: state.earlyBirdSessions,
        queueMaxSize: state.queueMaxSize,
        moodSessionCounts: state.moodSessionCounts,
      };

      await supabase.from('gamification_profiles').upsert({
        user_id: userId,
        gamification_data: dataToSync,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[SyncGamification] Failed to push state:', err);
    }
  }, 2000); // 2 second debounce
}

/**
 * Initializes realtime syncing for the user's gamification profile.
 * Merges server state on initial load, then listens for cross-device updates.
 */
export async function initGamificationSync(userId: string) {
  if (syncChannel) {
    supabase.removeChannel(syncChannel);
  }

  // 1. Initial Pull & Merge
  try {
    const { data } = await supabase
      .from('gamification_profiles')
      .select('gamification_data')
      .eq('user_id', userId)
      .single();

    if (data?.gamification_data) {
      isSyncingFromServer = true;
      const remoteState = data.gamification_data as any;
      const localState = useGamificationStore.getState();
      
      // Intelligent Merge: take the highest streak, max minutes, union of badges, etc.
      useGamificationStore.setState((state) => {
        state.listenMinutes = Math.max(state.listenMinutes, remoteState.listenMinutes || 0);
        state.streakDays = Math.max(state.streakDays, remoteState.streakDays || 0);
        state.longestStreak = Math.max(state.longestStreak, remoteState.longestStreak || 0);
        
        // Date comparison
        if (remoteState.lastListenDate && (!state.lastListenDate || remoteState.lastListenDate > state.lastListenDate)) {
          state.lastListenDate = remoteState.lastListenDate;
        }

        // Union arrays
        state.likedSongs = Array.from(new Set([...state.likedSongs, ...(remoteState.likedSongs || [])]));
        state.favoriteMoods = [...state.favoriteMoods, ...(remoteState.favoriteMoods || [])];
        
        const newBadges = (remoteState.earnedBadges || []).filter((b: string) => !state.earnedBadges.includes(b));
        state.earnedBadges.push(...newBadges);
        // Only trigger reveal if they earned it on another device recently? 
        // For now, we'll silently merge badges so they don't get spammed with reveals on load.

        state.nightOwlSessions = Math.max(state.nightOwlSessions, remoteState.nightOwlSessions || 0);
        state.earlyBirdSessions = Math.max(state.earlyBirdSessions, remoteState.earlyBirdSessions || 0);
        state.queueMaxSize = Math.max(state.queueMaxSize, remoteState.queueMaxSize || 0);

        // Merge object counts
        const remoteCounts = remoteState.moodSessionCounts || {};
        for (const [mood, count] of Object.entries(remoteCounts)) {
          state.moodSessionCounts[mood] = Math.max(state.moodSessionCounts[mood] || 0, count as number);
        }
      });
      isSyncingFromServer = false;
    }
  } catch (err) {
    console.error('[SyncGamification] Initial pull failed:', err);
  }

  // 2. Realtime Subscribe
  syncChannel = supabase
    .channel(`gamification:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'gamification_profiles',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // When another device updates the profile, sync it down immediately
        isSyncingFromServer = true;
        const remoteState = payload.new.gamification_data;
        useGamificationStore.setState((state) => {
          state.listenMinutes = remoteState.listenMinutes || state.listenMinutes;
          state.streakDays = remoteState.streakDays || state.streakDays;
          state.longestStreak = remoteState.longestStreak || state.longestStreak;
          state.lastListenDate = remoteState.lastListenDate || state.lastListenDate;
          state.likedSongs = remoteState.likedSongs || state.likedSongs;
          state.favoriteMoods = remoteState.favoriteMoods || state.favoriteMoods;
          
          const newBadges = (remoteState.earnedBadges || []).filter((b: string) => !state.earnedBadges.includes(b));
          if (newBadges.length > 0) {
            state.earnedBadges.push(...newBadges);
            // Optionally add to pendingReveal if you want cross-device badge popup
          }

          state.nightOwlSessions = remoteState.nightOwlSessions || state.nightOwlSessions;
          state.earlyBirdSessions = remoteState.earlyBirdSessions || state.earlyBirdSessions;
          state.queueMaxSize = remoteState.queueMaxSize || state.queueMaxSize;
          state.moodSessionCounts = remoteState.moodSessionCounts || state.moodSessionCounts;
        });
        isSyncingFromServer = false;
      }
    )
    .subscribe();

  // 3. Setup local store subscriber to push changes
  useGamificationStore.subscribe((state, prevState) => {
    if (!isSyncingFromServer) {
      // Only push if the meaningful data changed (ignore pendingReveal changes)
      if (
        state.listenMinutes !== prevState.listenMinutes ||
        state.streakDays !== prevState.streakDays ||
        state.earnedBadges.length !== prevState.earnedBadges.length ||
        state.likedSongs.length !== prevState.likedSongs.length
      ) {
        pushGamificationState(userId);
      }
    }
  });
}

export function stopGamificationSync() {
  if (syncChannel) {
    supabase.removeChannel(syncChannel);
    syncChannel = null;
  }
}
