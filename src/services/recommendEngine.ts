/**
 * recommendEngine.ts — The brain of Pandoos.
 * Scores candidates and builds the next-song queue.
 */
import type { Track } from '@/types/track';
import { inferTags, tagSimilarity } from '@/services/trackGraph';
import { MOOD_SEEDS } from '@/data/moodSeeds';
import { searchTracks } from '@/services/youtube';

interface RecommendOptions {
  currentTrack: Track;
  history: Track[];          // recently played — exclude these
  skippedIds: string[];      // never recommend skipped tracks
  getAffinityScore: (t: Track) => number;
  count?: number;
}

/**
 * Score a candidate track against the current track + taste profile.
 * Returns a value roughly in the range [-1, 2].
 */
function scoreCandidate(
  candidate: Track,
  currentTags: ReturnType<typeof inferTags>,
  affinityScore: number,
  isSkipped: boolean,
  isLoved: boolean,
  alreadyPlayed: boolean
): number {
  if (isSkipped) return -999; // Hard exclude
  if (alreadyPlayed) return -10; // Strong discourage (but not hard block)

  const candidateTags = inferTags(candidate.title, candidate.artist);
  const similarity = tagSimilarity(currentTags, candidateTags); // 0–1

  return (
    similarity * 0.45 +          // tag similarity to current song
    affinityScore * 0.35 +        // personal affinity
    (isLoved ? 0.2 : 0) +         // bonus for loved tracks
    (alreadyPlayed ? -0.3 : 0.1)  // novelty bonus
  );
}

/**
 * Build a rich search query from a track's inferred tags.
 * This is what gets sent to YouTube to find fresh recommendations.
 */
export function buildSearchQuery(track: Track): string {
  const tags = inferTags(track.title, track.artist);

  if (tags.isBollywood || tags.language === 'hindi') {
    return `bollywood ${tags.energy === 'high' ? 'party' : 'romantic'} hits ${new Date().getFullYear()}`;
  }
  if (tags.isDesi || tags.language === 'punjabi') {
    return `punjabi ${tags.energy === 'high' ? 'rap hip hop' : 'romantic'} hits`;
  }
  if (tags.isSufi) {
    return 'sufi qawwali ghazal best songs';
  }
  if (tags.isDevotional) {
    return 'bhakti bhajan aarti best songs';
  }
  if (tags.isLofi) {
    return 'lofi hip hop chill beats study music';
  }
  if (tags.isRock) {
    return `rock ${tags.era === '60s-80s' ? 'classic' : 'alternative'} best songs`;
  }
  if (tags.isElectronic) {
    return 'edm electronic dance music best hits';
  }
  if (tags.energy === 'high') {
    return `${track.artist} top hits energetic`;
  }
  if (tags.energy === 'low') {
    return 'relaxing acoustic chill songs';
  }

  // Default: artist-based
  return `${track.artist} top songs`;
}

/**
 * Main recommendation function.
 * Returns up to `count` recommended tracks, scored and sorted.
 */
export async function getRecommendations(opts: RecommendOptions): Promise<Track[]> {
  const { currentTrack, history, skippedIds, getAffinityScore, count = 5 } = opts;

  const currentTags = inferTags(currentTrack.title, currentTrack.artist);
  const historyIds = new Set(history.map(t => t.videoId));
  const lovedIds = new Set<string>(); // populated from store in hook

  // --- Candidate pool: all mood seeds ---
  const allSeeds = Object.values(MOOD_SEEDS).flat();
  // Deduplicate seeds by videoId
  const seenIds = new Set<string>();
  const uniqueSeeds = allSeeds.filter(t => {
    if (seenIds.has(t.videoId)) return false;
    seenIds.add(t.videoId);
    return true;
  });

  // Score all seeds
  const scoredSeeds = uniqueSeeds.map(candidate => ({
    track: candidate,
    score: scoreCandidate(
      candidate,
      currentTags,
      getAffinityScore(candidate),
      skippedIds.includes(candidate.videoId),
      lovedIds.has(candidate.videoId),
      historyIds.has(candidate.videoId)
    ),
  })).sort((a, b) => b.score - a.score);

  // Take top seeds (not skipped)
  const topSeeds = scoredSeeds
    .filter(s => s.score > -999)
    .slice(0, count + 3)
    .map(s => s.track);

  // --- Fresh picks: fetch from YouTube ---
  let freshTracks: Track[] = [];
  try {
    const query = buildSearchQuery(currentTrack);
    const results = await searchTracks(query);
    // Score the fresh results too
    freshTracks = results
      .filter(t => !skippedIds.includes(t.videoId))
      .map(t => ({
        track: t,
        score: scoreCandidate(
          t,
          currentTags,
          getAffinityScore(t),
          skippedIds.includes(t.videoId),
          lovedIds.has(t.videoId),
          historyIds.has(t.videoId)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count + 3)
      .map(s => s.track);
  } catch {
    // Quota exceeded or offline — fall back to seeds only
  }

  // --- Interleave seeds + fresh (alternating) for variety ---
  const combined: Track[] = [];
  const maxLen = Math.max(topSeeds.length, freshTracks.length);
  for (let i = 0; i < maxLen && combined.length < count * 2; i++) {
    if (freshTracks[i]) combined.push(freshTracks[i]!);
    if (topSeeds[i]) combined.push(topSeeds[i]!);
  }

  // Final dedup by videoId, exclude current track
  const finalIds = new Set<string>([currentTrack.videoId]);
  const deduped = combined.filter(t => {
    if (finalIds.has(t.videoId)) return false;
    finalIds.add(t.videoId);
    return true;
  });

  return deduped.slice(0, count);
}
