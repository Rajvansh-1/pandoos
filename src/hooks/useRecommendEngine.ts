/**
 * useRecommendEngine.ts
 * Watches the currently playing track and pre-fetches recommendations,
 * injecting them into the queue BEFORE the current song ends.
 * This eliminates the gap between songs — just like Spotify.
 */
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { getRecommendations } from '@/services/recommendEngine';
import type { Track } from '@/types/track';

export function useRecommendEngine() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const progress = usePlayerStore(s => s.progress);
  const queue = usePlayerStore(s => s.queue);
  const queueIndex = usePlayerStore(s => s.queueIndex);
  const history = usePlayerStore(s => s.history);
  const addTracksToQueue = usePlayerStore(s => s.addTracksToQueue);

  const skippedIds = useTasteStore(s => s.skippedIds);
  const getAffinityScore = useTasteStore(s => s.getAffinityScore);
  const recordPlay = useTasteStore(s => s.recordPlay);
  const recordLove = useTasteStore(s => s.recordLove);

  // Refs to avoid stale closures in async callbacks
  const fetchedForRef = useRef<string | null>(null);
  const prefetchFiredRef = useRef(false);

  // Record a play when a track starts
  useEffect(() => {
    if (currentTrack) {
      recordPlay(currentTrack);
      fetchedForRef.current = null;
      prefetchFiredRef.current = false;
    }
  }, [currentTrack?.videoId]);

  // Record "love" when user listens past 80%
  useEffect(() => {
    if (currentTrack && progress > 0.8) {
      recordLove(currentTrack);
    }
  }, [progress > 0.8, currentTrack?.videoId]);

  // Pre-fetch recommendations at 60% progress
  // This ensures next songs are ready before the current one ends
  useEffect(() => {
    if (!currentTrack) return;
    if (prefetchFiredRef.current) return;
    if (progress < 0.6) return;

    // Only pre-fetch if queue is about to run out
    const tracksLeft = queue.length - queueIndex - 1;
    if (tracksLeft > 10) return;

    prefetchFiredRef.current = true;
    fetchedForRef.current = currentTrack.videoId;

    getRecommendations({
      currentTrack,
      history,
      skippedIds,
      getAffinityScore,
      count: 20,
    }).then((recommendations: Track[]) => {
      if (recommendations.length > 0) {
        addTracksToQueue(recommendations);
      }
    }).catch(() => {
      // Silent fail — user still hears the current queue
    });
  }, [progress, currentTrack?.videoId, queue.length, queueIndex]);
}
