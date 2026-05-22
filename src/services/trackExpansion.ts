import type { Track } from '@/types/track';
import { MOOD_SEEDS } from '@/data/moodSeeds';

// Related mood groups — tracks from related moods blend together naturally
const RELATED_MOODS: Record<string, string[]> = {
  bollywood: ['romantic', 'sufi', 'desi'],
  desi:      ['bollywood', 'energy', 'happy'],
  sufi:      ['bollywood', 'romantic', 'heartbroken', 'devotional'],
  devotional: [],
  chill:     ['focus', 'sleepy', 'latenight'],
  energy:    ['workout', 'happy', 'desi'],
  focus:     ['chill', 'sleepy'],
  workout:   ['energy'],
  latenight: ['chill', 'heartbroken', 'romantic'],
  happy:     ['energy', 'romantic', 'bollywood'],
  romantic:  ['bollywood', 'sufi', 'happy', 'latenight'],
  heartbroken:['romantic', 'latenight', 'sleepy'],
  sleepy:    ['chill', 'focus'],
};

/** Seeded pseudo-random (deterministic per session) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * getExpandedTracklist — Returns a large, deduplicated list of tracks
 * for a given mood by blending the primary mood seeds with related moods.
 * No API calls — instant, zero-cost, infinite feel.
 */
export function getExpandedTracklist(moodId: string, seed = Date.now()): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];

  const addTracks = (tracks: Track[]) => {
    for (const t of tracks) {
      if (!seen.has(t.videoId)) {
        seen.add(t.videoId);
        result.push(t);
      }
    }
  };

  // Primary mood — full list, shuffled
  const primary = MOOD_SEEDS[moodId] ?? [];
  addTracks(seededShuffle(primary, seed));

  // Related moods — each contributes up to 8 tracks, interleaved
  const related = RELATED_MOODS[moodId] ?? [];
  const relatedBatches = related.map(relMood =>
    seededShuffle(MOOD_SEEDS[relMood] ?? [], seed + relMood.charCodeAt(0)).slice(0, 8)
  );

  // Interleave batches for variety
  const maxLen = Math.max(...relatedBatches.map(b => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const batch of relatedBatches) {
      if (batch[i]) addTracks([batch[i]]);
    }
  }

  return result;
}

/**
 * getPersonalizedTracklist — Boosts tracks matching the user's top tags.
 * Keeps non-matching tracks at the end for discovery.
 */
export function getPersonalizedTracklist(
  moodId: string,
  topTags: string[],
  seed = Date.now()
): Track[] {
  const all = getExpandedTracklist(moodId, seed);
  if (topTags.length === 0) return all;

  const boosted: Track[] = [];
  const rest: Track[] = [];

  for (const track of all) {
    const text = `${track.title} ${track.artist}`.toLowerCase();
    const isMatch = topTags.some(tag => text.includes(tag.toLowerCase()));
    if (isMatch) boosted.push(track);
    else rest.push(track);
  }

  return [...boosted, ...rest];
}
