import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

// ── Local Storage Keys ──────────────────────────────────────────
const PLAYLISTS_KEY = 'pandoos_playlists_v1';
const PLAYLIST_TRACKS_KEY = 'pandoos_playlist_tracks_v1';
const LIKED_SONGS_KEY = 'pandoos_liked_songs_v1';

// ── Helper functions ─────────────────────────────────────────────
const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// ── Playlists ────────────────────────────────────────────────────

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const allPlaylists = getStorage<Playlist[]>(PLAYLISTS_KEY, []);
  // Sort by updated at descending
  return allPlaylists
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function createPlaylist(
  userId: string,
  name: string,
  description = ''
): Promise<Playlist> {
  const newPlaylist: Playlist = {
    id: generateId(),
    userId,
    name,
    description,
    coverUrl: '',
    isPublic: false,
    trackCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allPlaylists = getStorage<Playlist[]>(PLAYLISTS_KEY, []);
  setStorage(PLAYLISTS_KEY, [newPlaylist, ...allPlaylists]);
  return newPlaylist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const allPlaylists = getStorage<Playlist[]>(PLAYLISTS_KEY, []);
  setStorage(PLAYLISTS_KEY, allPlaylists.filter(p => p.id !== playlistId));
  
  // Clean up tracks
  const allTracks = getStorage<Record<string, Track[]>>(PLAYLIST_TRACKS_KEY, {});
  delete allTracks[playlistId];
  setStorage(PLAYLIST_TRACKS_KEY, allTracks);
}

// ── Playlist Tracks ──────────────────────────────────────────────

export async function addTrackToPlaylist(
  playlistId: string,
  track: Track,
  position: number
): Promise<void> {
  const allTracks = getStorage<Record<string, Track[]>>(PLAYLIST_TRACKS_KEY, {});
  if (!allTracks[playlistId]) {
    allTracks[playlistId] = [];
  }
  
  // Prevent exact duplicates
  if (!allTracks[playlistId].find(t => t.videoId === track.videoId)) {
    allTracks[playlistId].push(track);
    setStorage(PLAYLIST_TRACKS_KEY, allTracks);

    // Update track count
    const allPlaylists = getStorage<Playlist[]>(PLAYLISTS_KEY, []);
    const updatedPlaylists = allPlaylists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          trackCount: allTracks[playlistId].length,
          updatedAt: new Date().toISOString(),
          coverUrl: allTracks[playlistId].length === 1 ? track.albumArt : p.coverUrl,
        };
      }
      return p;
    });
    setStorage(PLAYLISTS_KEY, updatedPlaylists);
  }
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  videoId: string
): Promise<void> {
  const allTracks = getStorage<Record<string, Track[]>>(PLAYLIST_TRACKS_KEY, {});
  if (allTracks[playlistId]) {
    allTracks[playlistId] = allTracks[playlistId].filter(t => t.videoId !== videoId);
    setStorage(PLAYLIST_TRACKS_KEY, allTracks);

    // Update track count
    const allPlaylists = getStorage<Playlist[]>(PLAYLISTS_KEY, []);
    const updatedPlaylists = allPlaylists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          trackCount: allTracks[playlistId].length,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setStorage(PLAYLISTS_KEY, updatedPlaylists);
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const allTracks = getStorage<Record<string, Track[]>>(PLAYLIST_TRACKS_KEY, {});
  return allTracks[playlistId] || [];
}

// ── Liked Songs ──────────────────────────────────────────────────

export async function getLikedSongs(userId: string): Promise<Track[]> {
  const allLiked = getStorage<Record<string, Track[]>>(LIKED_SONGS_KEY, {});
  return allLiked[userId] || [];
}

export async function likeTrack(userId: string, track: Track): Promise<void> {
  const allLiked = getStorage<Record<string, Track[]>>(LIKED_SONGS_KEY, {});
  if (!allLiked[userId]) allLiked[userId] = [];
  
  if (!allLiked[userId].find(t => t.videoId === track.videoId)) {
    allLiked[userId].unshift(track); // Add to top
    setStorage(LIKED_SONGS_KEY, allLiked);
  }
}

export async function unlikeTrack(userId: string, videoId: string): Promise<void> {
  const allLiked = getStorage<Record<string, Track[]>>(LIKED_SONGS_KEY, {});
  if (allLiked[userId]) {
    allLiked[userId] = allLiked[userId].filter(t => t.videoId !== videoId);
    setStorage(LIKED_SONGS_KEY, allLiked);
  }
}

export async function isTrackLiked(userId: string, videoId: string): Promise<boolean> {
  const allLiked = getStorage<Record<string, Track[]>>(LIKED_SONGS_KEY, {});
  if (!allLiked[userId]) return false;
  return allLiked[userId].some(t => t.videoId === videoId);
}

