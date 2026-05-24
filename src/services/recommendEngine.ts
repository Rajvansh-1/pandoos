/**
 * recommendEngine.ts — The brain of Pandoos.
 * Scores candidates and builds the next-song queue.
 */
import type { Track } from '@/types/track';
import { inferTags, tagSimilarity } from '@/services/trackGraph';
import { searchTracks } from '@/services/youtube';

interface RecommendOptions {
  currentTrack: Track;
  history: Track[];          // recently played — exclude these
  skippedIds: string[];      // never recommend skipped tracks
  getAffinityScore: (t: Track) => number;
  count?: number;
}

function scoreCandidate(
  candidate: Track,
  currentTags: ReturnType<typeof inferTags>,
  affinityScore: number,
  isSkipped: boolean,
  isLoved: boolean,
  alreadyPlayed: boolean
): number {
  if (isSkipped) return -999;
  if (alreadyPlayed) return -10;

  const candidateTags = inferTags(candidate.title, candidate.artist);
  const similarity = tagSimilarity(currentTags, candidateTags);

  return (
    similarity * 0.45 +
    affinityScore * 0.35 +
    (isLoved ? 0.2 : 0) +
    (alreadyPlayed ? -0.3 : 0.1)
  );
}

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

  return `${track.artist} top songs`;
}

export async function getRecommendations(opts: RecommendOptions): Promise<Track[]> {
  const { currentTrack, history, skippedIds, getAffinityScore, count = 5 } = opts;

  const currentTags = inferTags(currentTrack.title, currentTrack.artist);
  const historyIds = new Set(history.map(t => t.videoId));
  const lovedIds = new Set<string>();

  let freshTracks: Track[] = [];
  try {
    const query = buildSearchQuery(currentTrack);
    const results = await searchTracks(query);
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
      .slice(0, count + 5)
      .map(s => s.track);
  } catch {
    console.warn('Failed to fetch recommendations from YouTube');
  }

  const finalIds = new Set<string>([currentTrack.videoId]);
  const deduped = freshTracks.filter(t => {
    if (finalIds.has(t.videoId)) return false;
    finalIds.add(t.videoId);
    return true;
  });

  return deduped.slice(0, count);
}
