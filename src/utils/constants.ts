/** Application-wide constants — single source of truth. */

/** Current app version — shown in About screen */
export const APP_VERSION = '1.0.0';

/** YouTube thumbnail URL templates */
export const YT_THUMB = {
  /** High quality (480x360) — used in TrackCard */
  hq: (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  /** Max resolution (1280x720) — used in Vinyl center label */
  maxres: (videoId: string) => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  /** Standard (640x480) — fallback */
  sd: (videoId: string) => `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
} as const;

/** TanStack Query cache keys — centralised to prevent key typos */
export const QUERY_KEYS = {
  search: (query: string) => ['search', query] as const,
  trending: ['trending'] as const,
  lyrics: (title: string, artist: string) => ['lyrics', title, artist] as const,
  playlists: (userId: string) => ['playlists', userId] as const,
  playlist: (id: string) => ['playlist', id] as const,
  likedSongs: (userId: string) => ['liked-songs', userId] as const,
  followedArtists: (userId: string) => ['followed-artists', userId] as const,
} as const;

/** Zustand persist storage keys */
export const STORAGE_KEYS = {
  player: 'pandoos-player',
  theme: 'pandoos-theme',
  auth: 'pandoos-auth',
} as const;

/** Default colors for the Mood Engine (fallback when extraction fails) */
export const DEFAULT_THEME = {
  primary: '220 80% 60%', // Vibrant blue accent
  secondary: '190 90% 50%', // Cyan secondary
  accent: '250 80% 65%', // Indigo accent
  muted: '220 20% 40%',
} as const;

/** Moods mapped to search query prefixes for the Home page Mood Grid */
export const MOODS = [
  { id: 'chill', label: 'Chill', emoji: '🌙', query: 'lofi chill beats', color: '210 80% 60%' },
  { id: 'hype', label: 'Hype', emoji: '🔥', query: 'high energy edm bangers', color: '15 90% 60%' },
  { id: 'focus', label: 'Focus', emoji: '🎯', query: 'deep focus study music', color: '150 70% 55%' },
  { id: 'happy', label: 'Happy', emoji: '☀️', query: 'feel good pop hits 2024', color: '45 95% 60%' },
  { id: 'sad', label: 'Sad', emoji: '🌧️', query: 'sad emotional songs', color: '220 60% 55%' },
  { id: 'party', label: 'Party', emoji: '🎉', query: 'party dance hits', color: '320 85% 65%' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

/** Minimum swipe distance (px) to trigger a sheet close gesture */
export const SWIPE_CLOSE_THRESHOLD = 100;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 400;

/** Volume step size for keyboard controls */
export const VOLUME_STEP = 0.05;

/** Progress bar update interval (ms) — balance between smoothness and CPU */
export const PROGRESS_INTERVAL_MS = 500;
