import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { getRecommendations } from '@/services/recommendEngine';

/**
 * useRadioEngine — The brain that keeps the music playing endlessly.
 * Monitors the queue, and when the user is close to running out of songs,
 * silently fetches highly personalized recommendations and appends them.
 */
export function useRadioEngine() {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const queue = usePlayerStore(state => state.queue);
  const queueIndex = usePlayerStore(state => state.queueIndex);
  const history = usePlayerStore(state => state.history);
  
  // Ref to prevent concurrent fetches if user spams "next"
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!currentTrack) return;
    
    // Calculate how many tracks are left in the queue
    const remaining = queue.length - 1 - queueIndex;
    
    // Fetch more if we're 2 or fewer tracks from the end
    if (remaining <= 2 && !isFetchingRef.current) {
      isFetchingRef.current = true;
      
      const getAffinityScore = useTasteStore.getState().getAffinityScore;
      const skippedIds = useTasteStore.getState().skippedIds;

      getRecommendations({
        currentTrack,
        history,
        skippedIds,
        getAffinityScore,
        count: 5 // Fetch 5 at a time for seamless playback
      }).then((recs) => {
        const store = usePlayerStore.getState();
        const currentIds = new Set(store.queue.map(t => t.videoId));
        const fresh = recs.filter(t => !currentIds.has(t.videoId));
        
        if (fresh.length > 0) {
          store.addTracksToQueue(fresh);
          
          // Auto-resume if playback had completely stopped at the end of the queue
          const updatedStore = usePlayerStore.getState();
          if (!updatedStore.isPlaying && updatedStore.queueIndex === updatedStore.queue.length - fresh.length - 1) {
             updatedStore.nextTrack();
          }
        }
      }).catch(err => {
        console.error('Radio Engine Error:', err);
      }).finally(() => {
        isFetchingRef.current = false;
      });
    }
  }, [currentTrack?.videoId, queue.length, queueIndex, history]); // Dependencies trigger when progressing
}
