import { set, get, del, keys } from 'idb-keyval';
import type { Track } from '@/types/track';

export interface OfflineTrackMetadata {
  track: Track;
  downloadedAt: number;
}

// Prefixes for DB keys
const BLOB_PREFIX = 'blob:';
const META_PREFIX = 'meta:';

/**
 * Save a track and its audio blob to IndexedDB
 */
export async function saveTrackBlob(track: Track, blob: Blob): Promise<void> {
  const metadata: OfflineTrackMetadata = {
    track,
    downloadedAt: Date.now(),
  };

  await Promise.all([
    set(`${BLOB_PREFIX}${track.videoId}`, blob),
    set(`${META_PREFIX}${track.videoId}`, metadata)
  ]);
}

/**
 * Retrieve the audio blob for a specific track
 */
export async function getTrackBlob(videoId: string): Promise<Blob | undefined> {
  return await get(`${BLOB_PREFIX}${videoId}`);
}

/**
 * Retrieve the metadata for a specific track
 */
export async function getTrackMetadata(videoId: string): Promise<OfflineTrackMetadata | undefined> {
  return await get(`${META_PREFIX}${videoId}`);
}

/**
 * Delete a track from offline storage
 */
export async function deleteTrackBlob(videoId: string): Promise<void> {
  await Promise.all([
    del(`${BLOB_PREFIX}${videoId}`),
    del(`${META_PREFIX}${videoId}`)
  ]);
}

/**
 * Get all downloaded tracks metadata (useful for the Offline Library view)
 */
export async function getAllOfflineTracks(): Promise<Track[]> {
  const allKeys = await keys();
  const metaKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(META_PREFIX)) as string[];
  
  const tracks: Track[] = [];
  for (const key of metaKeys) {
    const meta = await get<OfflineTrackMetadata>(key);
    if (meta && meta.track) {
      tracks.push(meta.track);
    }
  }
  
  return tracks;
}

/**
 * Quickly check if a track exists in offline storage
 */
export async function isTrackDownloaded(videoId: string): Promise<boolean> {
  const meta = await get(`${META_PREFIX}${videoId}`);
  return !!meta;
}
