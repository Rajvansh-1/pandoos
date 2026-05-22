import { useMemo } from 'react';
import { inferTags } from '@/services/trackGraph';
import type { Track } from '@/types/track';

export function useTrackEmotion(track: Track | null): string {
  return useMemo(() => {
    if (!track) return 'chill';
    
    const tags = inferTags(track.title, track.artist);
    
    if (tags.isSufi) return 'sufi';
    if (tags.isDevotional) return 'devotional';
    if (tags.isBollywood) {
      if (tags.energy === 'high') return 'bollywood';
      if (tags.moods.includes('romantic')) return 'romantic';
      return 'bollywood';
    }
    if (tags.isDesi) return 'desi';
    
    if (tags.moods.includes('heartbroken')) return 'heartbroken';
    if (tags.moods.includes('happy')) return 'happy';
    if (tags.moods.includes('latenight')) return 'latenight';
    if (tags.moods.includes('workout')) return 'workout';
    if (tags.moods.includes('energy') || tags.energy === 'high') return 'energy';
    if (tags.moods.includes('focus')) return 'focus';
    
    if (tags.isLofi || tags.moods.includes('chill')) return 'chill';
    
    return 'neutral';
  }, [track]);
}
