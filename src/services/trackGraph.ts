/**
 * trackGraph.ts — Client-side tag inference engine.
 * Derives rich metadata tags from a track's title + artist string
 * with NO external API calls. Powers the recommendation scoring.
 */

export interface TrackTags {
  genres: string[];
  moods: string[];
  energy: 'low' | 'medium' | 'high';
  language: 'hindi' | 'punjabi' | 'english' | 'arabic' | 'mixed';
  era: '60s-80s' | '90s-00s' | '10s' | '20s' | 'timeless';
  isBollywood: boolean;
  isDesi: boolean;
  isSufi: boolean;
  isDevotional: boolean;
  isLofi: boolean;
  isElectronic: boolean;
  isRock: boolean;
  isAcoustic: boolean;
}

const lower = (s: string) => s.toLowerCase();

// ─── Keyword banks ────────────────────────────────────────────────────────────

const BOLLYWOOD_ARTISTS = [
  'arijit singh', 'atif aslam', 'ar rahman', 'pritam', 'sonu nigam',
  'shreya ghoshal', 'udit narayan', 'kumar sanu', 'lata mangeshkar',
  'kishore kumar', 'sachet tandon', 'tulsi kumar', 'vishal shekhar',
  'shankar ehsaan loy', 'amit trivedi',
];
const BOLLYWOOD_WORDS = [
  'bollywood', 'aashiqui', 'kabir singh', 'raabta', 'jab harry',
  'yeh jawaani', 'ae dil', 'brahmāstra', 'brahmastra', 'rockstar',
  'half girlfriend', 'tiger zinda', 'kal ho naa', 'dilwale',
  'rang de basanti', 'zindagi na milegi', 'dil to pagal',
];
const DESI_ARTISTS = [
  'ap dhillon', 'sidhu moose wala', 'diljit dosanjh', 'badshah',
  'yo yo honey singh', 'guru randhawa', 'jasmine sandlas',
  'ammy virk', 'harrdy sandhu', 'b praak',
];
const SUFI_WORDS = [
  'sufi', 'qawwali', 'ghazal', 'nusrat fateh', 'abida parveen',
  'rahat fateh', 'tajdar', 'kun faya', 'afreen', 'bulleh shah',
  'mast qalandar', 'mast kalander', 'ya ali', 'maula',
];
const DEVOTIONAL_WORDS = [
  'bhakti', 'devotional', 'aarti', 'mantra', 'bhajan', 'kirtan', 
  'chalisa', 'krishna', 'ram', 'shiv', 'ganesh', 'hanuman', 'mata',
  'sai', 'gurudwara', 'shabad', 'gurbani', 'waheguru',
];
const LOFI_WORDS = [
  'lofi', 'lo-fi', 'lo fi', 'chill hop', 'chillhop', 'beats to',
  'study music', 'focus music', 'relax music', 'coffee shop',
];
const ELECTRONIC_ARTISTS = [
  'martin garrix', 'alan walker', 'daft punk', 'avicii', 'calvin harris',
  'skrillex', 'diplo', 'kygo', 'chainsmokers', 'marshmello', 'tiësto',
  'zedd', 'david guetta', 'deadmau5',
];
const ROCK_WORDS = [
  'nirvana', 'ac/dc', 'metallica', 'linkin park', 'system of a down',
  'rage against', 'green day', 'foo fighters', 'the killers',
  'arctic monkeys', 'imagine dragons', 'twenty one pilots',
];
const HIGH_ENERGY_WORDS = [
  'thunderstruck', 'eye of the tiger', 'radioactive', 'bangarang',
  'animals', 'faded', 'power', 'till i collapse', 'lose yourself',
  'enemy', 'thunder', 'smells like teen spirit', 'chop suey',
  'brown munde', '295', 'insane', 'phonk', 'workout', 'gym',
];
const LOW_ENERGY_WORDS = [
  'sleep', 'lullaby', 'calm', 'weightless', 'piano', 'nocturne',
  'ambient', 'delta waves', 'spa', 'meditation', 'rain sounds',
  'nature sounds', 'lofi', 'lo-fi', 'chill',
];
const ACOUSTIC_WORDS = [
  'acoustic', 'unplugged', 'piano', 'guitar', 'classical', 'orchestra',
  'instrumental', 'live session', 'mahalia', 'ed sheeran', 'john mayer',
];
const HINDI_WORDS = [
  'tum hi ho', 'kesariya', 'channa mereya', 'hawayein', 'kal ho naa',
  'kabira', 'kun faya', 'bekhayali', 'tera ban', 'dil diyan',
];
const PUNJABI_WORDS = [
  'punjabi', 'bhangra', 'diljit', 'sidhu', 'ap dhillon', 'brown munde',
  'moosewala', 'proper patola', 'kala chashma', 'goat',
];

// ─── Inference Functions ──────────────────────────────────────────────────────

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

export function inferTags(title: string, artist: string): TrackTags {
  const text = lower(`${title} ${artist}`);

  const isBollywood = hasAny(text, BOLLYWOOD_WORDS) || hasAny(text, BOLLYWOOD_ARTISTS);
  const isDesi = hasAny(text, DESI_ARTISTS) || hasAny(text, PUNJABI_WORDS);
  const isSufi = hasAny(text, SUFI_WORDS);
  const isDevotional = hasAny(text, DEVOTIONAL_WORDS);
  const isLofi = hasAny(text, LOFI_WORDS);
  const isElectronic = hasAny(text, ELECTRONIC_ARTISTS) || text.includes('edm') || text.includes('house');
  const isRock = hasAny(text, ROCK_WORDS);
  const isAcoustic = hasAny(text, ACOUSTIC_WORDS) && !isElectronic && !isRock;

  const highEnergy = hasAny(text, HIGH_ENERGY_WORDS) || isRock || (isDesi && !isSufi);
  const lowEnergy = hasAny(text, LOW_ENERGY_WORDS) || isSufi || isLofi || isDevotional;
  const energy: TrackTags['energy'] = highEnergy ? 'high' : lowEnergy ? 'low' : 'medium';

  const language: TrackTags['language'] =
    hasAny(text, PUNJABI_WORDS) && !isBollywood ? 'punjabi'
    : hasAny(text, HINDI_WORDS) || isBollywood || isDevotional ? 'hindi'
    : hasAny(text, SUFI_WORDS) ? 'arabic'
    : (isBollywood && isDesi) ? 'mixed'
    : 'english';

  const genres: string[] = [];
  if (isBollywood) genres.push('bollywood');
  if (isDesi) genres.push('desi', 'punjabi');
  if (isSufi) genres.push('sufi', 'qawwali');
  if (isDevotional) genres.push('devotional', 'bhakti');
  if (isLofi) genres.push('lofi', 'chillhop');
  if (isElectronic) genres.push('electronic', 'edm');
  if (isRock) genres.push('rock');
  if (isAcoustic) genres.push('acoustic', 'piano');
  if (genres.length === 0) genres.push('pop');

  const moods: string[] = [];
  if (lowEnergy && isLofi) moods.push('chill', 'focus');
  if (isSufi) moods.push('sufi', 'peaceful', 'spiritual');
  if (isDevotional) moods.push('devotional', 'peaceful', 'spiritual');
  if (isBollywood && energy === 'medium') moods.push('romantic', 'bollywood');
  if (isDesi && energy === 'high') moods.push('party', 'desi');
  if (isRock || (energy === 'high' && !isBollywood)) moods.push('energy', 'workout');
  if (text.includes('sad') || text.includes('heartbroken') || text.includes('tears')) moods.push('heartbroken');
  if (text.includes('happy') || text.includes('joy') || text.includes('feel good')) moods.push('happy');
  if (text.includes('night') || text.includes('midnight') || text.includes('synthwave')) moods.push('latenight');
  if (moods.length === 0) moods.push('chill');

  // Era detection (rough)
  const era: TrackTags['era'] =
    hasAny(text, ['nirvana', 'ac/dc', 'michael jackson', 'queen', 'led zeppelin', 'beatles']) ? '60s-80s'
    : hasAny(text, ['eminem', 'linkin park', 'backstreet', 'spice girls', 'nelly']) ? '90s-00s'
    : hasAny(text, ['ed sheeran', 'adele', 'one direction', 'katy perry']) ? '10s'
    : hasAny(text, ['olivia rodrigo', 'billie eilish', 'doja cat', 'ap dhillon', 'kesariya']) ? '20s'
    : 'timeless';

  return { genres, moods, energy, language, era, isBollywood, isDesi, isSufi, isDevotional, isLofi, isElectronic, isRock, isAcoustic };
}

/**
 * Compute a tag overlap score between two tracks (0–1).
 * Higher = more similar. Used as the primary recommendation signal.
 */
export function tagSimilarity(a: TrackTags, b: TrackTags): number {
  let score = 0;
  let total = 0;

  // Boolean flags — high weight
  const boolFields: (keyof TrackTags)[] = ['isBollywood', 'isDesi', 'isSufi', 'isDevotional', 'isLofi', 'isElectronic', 'isRock', 'isAcoustic'];
  for (const f of boolFields) {
    total += 2;
    if (a[f] === b[f]) score += 2;
  }

  // Energy — high weight
  total += 3;
  if (a.energy === b.energy) score += 3;
  else if (Math.abs(['low','medium','high'].indexOf(a.energy) - ['low','medium','high'].indexOf(b.energy)) === 1) score += 1;

  // Language match
  total += 2;
  if (a.language === b.language) score += 2;

  // Era match
  total += 1;
  if (a.era === b.era) score += 1;

  // Genre overlap
  const genreOverlap = a.genres.filter(g => b.genres.includes(g)).length;
  const maxGenres = Math.max(a.genres.length, b.genres.length, 1);
  score += (genreOverlap / maxGenres) * 3;
  total += 3;

  // Mood overlap
  const moodOverlap = a.moods.filter(m => b.moods.includes(m)).length;
  const maxMoods = Math.max(a.moods.length, b.moods.length, 1);
  score += (moodOverlap / maxMoods) * 2;
  total += 2;

  return score / total;
}
