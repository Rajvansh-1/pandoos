/**
 * nowPlayingSync.ts — Spotify-style "Now Playing" cross-device sync.
 * Uses flat columns matching the now_playing table in your existing Supabase schema.
 */

import { supabase } from '@/services/supabase';
import type { Track } from '@/types/track';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { Device } from '@capacitor/device';

let DEVICE_NAME = 'Web';

async function initDeviceName() {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNative) {
    const info = await Device.getInfo();
    DEVICE_NAME = `${info.operatingSystem === 'ios' ? 'iPhone/iPad' : 'Android'} (App)`;
  } else {
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (isElectron) {
      DEVICE_NAME = 'Desktop App';
    } else {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) DEVICE_NAME = 'Android';
      else if (/ipad|iphone|ipod/.test(ua)) DEVICE_NAME = 'iPhone/iPad';
    }
  }
}
initDeviceName();
let writeInterval: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: RealtimeChannel | null = null;

let _lastTrack: Track | null = null;
let _isPlaying = false;
let _progress = 0;
let _userId: string | null = null;

export function initNowPlayingSync(userId: string): void {
  _userId = userId;
  startWriteLoop();
}

export function updateNowPlayingState(track: Track | null, isPlaying: boolean, progress: number): void {
  _lastTrack = track;
  _isPlaying = isPlaying;
  _progress = progress;
}

function startWriteLoop(): void {
  if (writeInterval) clearInterval(writeInterval);
  writeNowPlaying();
  writeInterval = setInterval(writeNowPlaying, 5000);
}

async function writeNowPlaying(): Promise<void> {
  if (!_userId || !_lastTrack) return;
  try {
    await supabase.from('now_playing').upsert({
      user_id: _userId,
      video_id: _lastTrack.videoId,
      title: _lastTrack.title,
      artist: _lastTrack.artist,
      album_art: _lastTrack.albumArt,
      is_playing: _isPlaying,
      progress: _progress,
      device_name: DEVICE_NAME,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch { /* silent */ }
}

export async function getOtherDeviceNowPlaying(
  userId: string
): Promise<{ track: Track; deviceName: string; isPlaying: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('now_playing')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    const updatedAt = new Date(data.updated_at).getTime();
    const isStale = Date.now() - updatedAt > 30_000;
    if (isStale || data.device_name === DEVICE_NAME) return null;

    const track: Track = {
      id: data.video_id,
      videoId: data.video_id,
      title: data.title,
      artist: data.artist,
      albumArt: data.album_art ?? `https://i.ytimg.com/vi/${data.video_id}/hqdefault.jpg`,
      duration: 0,
      source: 'youtube',
    };

    return { track, deviceName: data.device_name, isPlaying: data.is_playing };
  } catch { return null; }
}

export function subscribeToNowPlaying(
  userId: string,
  onUpdate: (track: Track, deviceName: string, isPlaying: boolean) => void
): void {
  unsubscribeFromNowPlaying();

  realtimeChannel = supabase.channel(`now_playing:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'now_playing', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        const data = payload.new;
        if (!data || data.device_name === DEVICE_NAME || !data.video_id) return;
        const track: Track = {
          id: data.video_id,
          videoId: data.video_id,
          title: data.title,
          artist: data.artist,
          albumArt: data.album_art ?? `https://i.ytimg.com/vi/${data.video_id}/hqdefault.jpg`,
          duration: 0,
          source: 'youtube',
        };
        onUpdate(track, data.device_name, data.is_playing);
      }
    )
    .subscribe();
}

export function unsubscribeFromNowPlaying(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

export function stopNowPlayingSync(): void {
  if (writeInterval) { clearInterval(writeInterval); writeInterval = null; }
  unsubscribeFromNowPlaying();
  _userId = null;
  _lastTrack = null;
}
