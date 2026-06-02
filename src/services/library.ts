/**
 * library.ts — Cloud-first library service.
 * Schema matches your existing Supabase tables:
 *   - liked_songs      (user_id text, video_id, title, artist, album_art, duration)
 *   - playlists        (user_id text, id uuid, name, ...)
 *   - playlist_tracks  (playlist_id uuid, video_id, title, artist, album_art, duration, position)
 *   - followed_artists (user_id text, artist_id, name, thumbnail_url)
 *
 * Strategy: Write to Supabase + localStorage cache simultaneously.
 * Reads try Supabase first; fall back to localStorage if offline.
 */

import { supabase } from '@/services/supabase';
import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

// Standard UUID v4 generator fallback
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Local Cache Keys (offline fallback) ─────────────────────
const CACHE = {
  liked: (uid: string) => `pandoos_liked_v3_${uid}`,
  playlists: (uid: string) => `pandoos_playlists_v3_${uid}`,
  playlistTracks: (pid: string) => `pandoos_ptracks_v3_${pid}`,
  followedArtists: (uid: string) => `pandoos_followed_v3_${uid}`,
};

const getCache = <T>(key: string, def: T): T => {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : def; } catch { return def; }
};
const setCache = <T>(key: string, val: T) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota full */ }
};

/** Map a Supabase liked_songs row → Track */
function rowToTrack(row: any): Track {
  return {
    id: row.video_id,
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    albumArt: row.album_art ?? `https://i.ytimg.com/vi/${row.video_id}/hqdefault.jpg`,
    duration: row.duration ?? 0,
    source: 'youtube' as const,
  };
}

/** Map a Track → liked_songs insert row */
function trackToLikedRow(userId: string, track: Track) {
  return {
    user_id: userId,
    video_id: track.videoId,
    title: track.title,
    artist: track.artist,
    album_art: track.albumArt,
    duration: track.duration ?? 0,
  };
}

// ════════════════════════════════════════════════════════════
// LIKED SONGS
// ════════════════════════════════════════════════════════════

export async function getLikedSongs(userId: string): Promise<Track[]> {
  if (userId === 'guest') return getCache<Track[]>(CACHE.liked(userId), []);

  try {
    const { data, error } = await supabase
      .from('liked_songs')
      .select('*')
      .eq('user_id', userId)
      .order('liked_at', { ascending: false });

    if (!error && data) {
      const remoteTracks = data.map(rowToTrack);
      const localTracks = getCache<any[]>(CACHE.liked(userId), []);
      // Keep items that failed to sync to Supabase, but allow cross-device deletions to drop items
      const localOnly = localTracks.filter(lt => lt._syncFailed && !remoteTracks.some(rt => rt.videoId === lt.videoId));
      
      const merged = [...localOnly, ...remoteTracks];
      setCache(CACHE.liked(userId), merged);
      return merged as Track[];
    }
    if (error) console.error('[Library] getLikedSongs error:', error);
  } catch (err) { console.error('[Library] getLikedSongs catch:', err); }

  return getCache<Track[]>(CACHE.liked(userId), []);
}

export async function likeTrack(userId: string, track: Track): Promise<void> {
  // Optimistic local update
  const cached = getCache<Track[]>(CACHE.liked(userId), []);
  if (!cached.find(t => t.videoId === track.videoId)) {
    setCache(CACHE.liked(userId), [track, ...cached]);
  }

  if (userId === 'guest') return;

  try {
    const { error } = await supabase.from('liked_songs')
      .upsert(trackToLikedRow(userId, track), { onConflict: 'user_id,video_id' });
    if (error) {
      console.error('[Library] likeTrack error, retrying with minimal fields:', error);
      const retry = await supabase.from('liked_songs').upsert({
        user_id: userId,
        video_id: track.videoId,
        title: track.title,
        artist: track.artist
      }, { onConflict: 'user_id,video_id' });
      if (retry.error) {
        console.error('[Library] likeTrack retry failed:', retry.error);
        const currentCache = getCache<any[]>(CACHE.liked(userId), []);
        setCache(CACHE.liked(userId), currentCache.map(t => t.videoId === track.videoId ? { ...t, _syncFailed: true } : t));
      }
    }
  } catch (err) { 
    console.error('[Library] likeTrack catch:', err);
    const currentCache = getCache<any[]>(CACHE.liked(userId), []);
    setCache(CACHE.liked(userId), currentCache.map(t => t.videoId === track.videoId ? { ...t, _syncFailed: true } : t));
  }
}

export async function unlikeTrack(userId: string, videoId: string): Promise<void> {
  // Optimistic local update
  const cached = getCache<Track[]>(CACHE.liked(userId), []);
  setCache(CACHE.liked(userId), cached.filter(t => t.videoId !== videoId));

  if (userId === 'guest') return;

  try {
    const { error } = await supabase.from('liked_songs')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId);
    if (error) console.error('[Library] unlikeTrack error:', error);
  } catch (err) { console.error('[Library] unlikeTrack catch:', err); }
}

export async function isTrackLiked(userId: string, videoId: string): Promise<boolean> {
  // Check cache first for instant UI response and robust fallback
  const cached = getCache<Track[]>(CACHE.liked(userId), []);
  if (cached.some(t => t.videoId === videoId)) return true;

  if (userId === 'guest') return false;

  try {
    const { data } = await supabase
      .from('liked_songs')
      .select('video_id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();
    return !!data;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════
// PLAYLISTS
// ════════════════════════════════════════════════════════════

function rowToPlaylist(row: any): Playlist {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? '',
    coverUrl: row.cover_url ?? '',
    isPublic: row.is_public ?? false,
    trackCount: row.track_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  if (userId === 'guest') return getCache<Playlist[]>(CACHE.playlists(userId), []);

  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const remotePlaylists = data.map(rowToPlaylist);
      const localPlaylists = getCache<any[]>(CACHE.playlists(userId), []);
      const localOnly = localPlaylists.filter(lp => lp._syncFailed && !remotePlaylists.some(rp => rp.id === lp.id));
      
      const merged = [...localOnly, ...remotePlaylists];
      setCache(CACHE.playlists(userId), merged);
      return merged as Playlist[];
    }
    if (error) console.error('[Library] getUserPlaylists error:', error);
  } catch (err) { console.error('[Library] getUserPlaylists catch:', err); }

  return getCache<Playlist[]>(CACHE.playlists(userId), []);
}

export async function createPlaylist(userId: string, name: string, description = ''): Promise<Playlist> {
  const localId = generateUUID();
  let playlist: Playlist | null = null;

  if (userId !== 'guest') {
    let { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: userId, name, description, is_public: false, track_count: 0 })
      .select()
      .single();

    if (error) {
      console.error('[Library] createPlaylist error, retrying minimal:', error);
      const retry = await supabase
        .from('playlists')
        .insert({ user_id: userId, name })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      playlist = rowToPlaylist(data);
    } else if (error) {
      console.error('[Library] createPlaylist final error:', error);
    }
  }

  if (!playlist) {
    // Offline / Guest fallback
    playlist = {
      id: localId,
      userId,
      name,
      description,
      coverUrl: '',
      isPublic: false,
      trackCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _syncFailed: userId !== 'guest' // Mark as syncFailed if we are logged in but it failed
    } as Playlist & { _syncFailed?: boolean };
  }

  // Update cache
  const cached = getCache<Playlist[]>(CACHE.playlists(userId), []);
  setCache(CACHE.playlists(userId), [playlist, ...cached]);

  return playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  // Optimistic local deletion
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pandoos_playlists_v3_')) {
        const cached = getCache<Playlist[]>(key, []);
        if (cached.find(p => p.id === playlistId)) {
          setCache(key, cached.filter(p => p.id !== playlistId));
          break;
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) console.error('[Library] deletePlaylist error:', error);
  } catch (err) { console.error('[Library] deletePlaylist catch:', err); }
}

// ════════════════════════════════════════════════════════════
// PLAYLIST TRACKS
// ════════════════════════════════════════════════════════════

function ptRowToTrack(row: any): Track {
  return {
    id: row.video_id,
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    albumArt: row.album_art ?? `https://i.ytimg.com/vi/${row.video_id}/hqdefault.jpg`,
    duration: row.duration ?? 0,
    source: 'youtube' as const,
  };
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (!error && data) {
      const tracks = data.map(ptRowToTrack);
      setCache(CACHE.playlistTracks(playlistId), tracks);
      return tracks;
    }
  } catch { /* offline */ }

  return getCache<Track[]>(CACHE.playlistTracks(playlistId), []);
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: Track,
  position: number
): Promise<void> {
  // Optimistic cache update
  const cached = getCache<Track[]>(CACHE.playlistTracks(playlistId), []);
  if (!cached.find(t => t.videoId === track.videoId)) {
    setCache(CACHE.playlistTracks(playlistId), [...cached, track]);
  }

  try {
    const { error } = await supabase.from('playlist_tracks').insert({
      playlist_id: playlistId,
      video_id: track.videoId,
      title: track.title,
      artist: track.artist,
      album_art: track.albumArt,
      duration: track.duration ?? 0,
      position,
    });
    if (error) {
      console.error('[Library] addTrackToPlaylist error, retrying minimal:', error);
      await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        video_id: track.videoId,
        title: track.title,
        artist: track.artist,
      });
    }
    // track_count auto-updated by Supabase trigger
  } catch (err) { console.error('[Library] addTrackToPlaylist catch:', err); }
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  videoId: string
): Promise<void> {
  const cached = getCache<Track[]>(CACHE.playlistTracks(playlistId), []);
  setCache(CACHE.playlistTracks(playlistId), cached.filter(t => t.videoId !== videoId));

  try {
    await supabase.from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);
    // track_count auto-updated by Supabase trigger
  } catch { /* will sync */ }
}

// ════════════════════════════════════════════════════════════
// FOLLOWED ARTISTS
// ════════════════════════════════════════════════════════════

export async function getFollowedArtists(userId: string): Promise<any[]> {
  if (userId === 'guest') return getCache<any[]>(CACHE.followedArtists(userId), []);

  try {
    const { data, error } = await supabase
      .from('followed_artists')
      .select('*')
      .eq('user_id', userId)
      .order('followed_at', { ascending: false });

    if (!error && data) {
      const remoteArtists = data.map((row: any) => ({
        artistId: row.artist_id,
        name: row.name,
        thumbnails: row.thumbnail_url ? [{ url: row.thumbnail_url }] : [],
      }));
      const localArtists = getCache<any[]>(CACHE.followedArtists(userId), []);
      const localOnly = localArtists.filter(la => la._syncFailed && !remoteArtists.some(ra => ra.artistId === la.artistId));
      
      const merged = [...localOnly, ...remoteArtists];
      setCache(CACHE.followedArtists(userId), merged);
      return merged;
    }
  } catch { /* offline */ }

  return getCache<any[]>(CACHE.followedArtists(userId), []);
}

export async function followArtist(userId: string, artist: any): Promise<void> {
  const cached = getCache<any[]>(CACHE.followedArtists(userId), []);
  if (!cached.find(a => a.artistId === artist.artistId)) {
    setCache(CACHE.followedArtists(userId), [artist, ...cached]);
  }

  if (userId === 'guest') return;

  try {
    const { error } = await supabase.from('followed_artists').upsert({
      user_id: userId,
      artist_id: artist.artistId,
      name: artist.name,
      thumbnail_url: artist.thumbnails?.[0]?.url ?? null,
    }, { onConflict: 'user_id,artist_id' });
    
    if (error) {
      console.error('[Library] followArtist error, retrying minimal:', error);
      const retry = await supabase.from('followed_artists').upsert({
        user_id: userId,
        artist_id: artist.artistId,
        name: artist.name
      }, { onConflict: 'user_id,artist_id' });
      if (retry.error) {
        console.error('[Library] followArtist retry failed:', retry.error);
        const currentCache = getCache<any[]>(CACHE.followedArtists(userId), []);
        setCache(CACHE.followedArtists(userId), currentCache.map(a => a.artistId === artist.artistId ? { ...a, _syncFailed: true } : a));
      }
    }
  } catch (err) {
    console.error('[Library] followArtist catch:', err);
    const currentCache = getCache<any[]>(CACHE.followedArtists(userId), []);
    setCache(CACHE.followedArtists(userId), currentCache.map(a => a.artistId === artist.artistId ? { ...a, _syncFailed: true } : a));
  }
}

export async function unfollowArtist(userId: string, artistId: string): Promise<void> {
  const cached = getCache<any[]>(CACHE.followedArtists(userId), []);
  setCache(CACHE.followedArtists(userId), cached.filter(a => a.artistId !== artistId));

  if (userId === 'guest') return;

  try {
    await supabase.from('followed_artists')
      .delete()
      .eq('user_id', userId)
      .eq('artist_id', artistId);
  } catch { /* will sync */ }
}

export async function isArtistFollowed(userId: string, artistId: string): Promise<boolean> {
  // Always check cache first for instant UI response and offline robust fallback
  const cached = getCache<any[]>(CACHE.followedArtists(userId), []);
  if (cached.some(a => a.artistId === artistId)) return true;

  if (userId === 'guest') return false;

  const { data, error } = await supabase
    .from('followed_artists')
    .select('id')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();

  if (error) {
    console.error('Error checking artist follow status:', error);
    return false;
  }

  return !!data;
}

export async function updatePlaylistDetails(playlistId: string, name: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from('playlists')
    .update({ name, description: description || '', updated_at: new Date().toISOString() })
    .eq('id', playlistId);
    
  if (error) {
    console.error('Error updating playlist details:', error);
    throw error;
  }
}

export async function reorderPlaylistTracks(playlistId: string, trackIds: string[]): Promise<void> {
  // Update each track's position in parallel
  // Note: For a very large playlist, this might need batching, but for < 100 it's fine.
  const updates = trackIds.map((videoId, index) => 
    supabase
      .from('playlist_tracks')
      .update({ position: index })
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId)
  );

  await Promise.all(updates);
}

// ── Playlist Tracks ───────────────────────────────────────────────────

export async function getListeningHistory(userId: string): Promise<Track[]> {
  if (userId === 'guest') return [];

  const { data, error } = await supabase
    .from('listening_history')
    .select('*')
    .eq('user_id', userId)
    .order('listened_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching listening history:', error);
    return [];
  }

  // Deduplicate by video_id
  const seen = new Set<string>();
  const tracks: Track[] = [];

  for (const row of data || []) {
    if (seen.has(row.video_id)) continue;
    seen.add(row.video_id);
    
    tracks.push({
      id: row.video_id,
      videoId: row.video_id,
      title: row.title,
      artist: row.artist,
      albumArt: row.album_art || `https://i.ytimg.com/vi/${row.video_id}/hqdefault.jpg`,
      duration: row.duration || 0,
      source: 'youtube'
    });

    if (tracks.length >= 20) break;
  }

  return tracks;
}
