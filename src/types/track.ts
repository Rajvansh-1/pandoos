/**
 * Core Track entity.
 * Designed to be source-agnostic so future audio sources (Soundcloud,
 * direct MP3, etc.) can be added without touching components.
 */
export interface Track {
  /** Unique identifier — for YouTube this equals videoId */
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  /** Highest resolution thumbnail available */
  readonly albumArt: string;
  /** Duration in seconds (0 if unknown before playback) */
  readonly duration: number;
  /** YouTube video ID — used for IFrame API and thumbnail URLs */
  readonly videoId: string;
  readonly source: 'youtube';
  /** Optional: channel name for disambiguation */
  readonly channelTitle?: string;
  /** Optional: publish date string */
  readonly publishedAt?: string;
  /** Optional: view count for popularity sorting */
  readonly viewCount?: number;
  /** YTM browseId for the artist */
  readonly artistId?: string;
  /** YTM browseId for the album */
  readonly albumId?: string;
}

/**
 * Raw shape returned by YouTube Data API v3 search.list.
 * We transform this into Track via the youtube service.
 */
export interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high: { url: string };
      maxres?: { url: string };
    };
    publishedAt: string;
    artistId?: string;
    albumId?: string;
  };
}

/** YouTube IFrame player ready state (subset of YT.PlayerState) */
export type YouTubePlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';
