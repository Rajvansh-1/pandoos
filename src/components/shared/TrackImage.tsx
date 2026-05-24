import React, { useState, useEffect, useRef } from 'react';
import { Music2 } from 'lucide-react';

interface TrackImageProps {
  videoId: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ─────────────────────────────────────────────────────────────
// Module-level image URL cache — persists across React re-mounts
// and navigation. Maps videoId → the working thumbnail URL.
// This means navigating away and back never re-fetches.
// ─────────────────────────────────────────────────────────────
const resolvedUrls = new Map<string, string | 'error'>();

// YouTube serves a 120×90 grey stub for missing thumbnails.
const YT_STUB_WIDTH = 120;

function buildUrl(videoId: string, quality: 'hq' | 'sd' | 'mq'): string {
  const suffix = quality === 'hq' ? 'hqdefault' : quality === 'sd' ? 'sddefault' : 'mqdefault';
  return `https://i.ytimg.com/vi/${videoId}/${suffix}.jpg`;
}

const QUALITY_CHAIN: Array<'hq' | 'sd' | 'mq'> = ['hq', 'sd', 'mq'];

/**
 * TrackImage — Production-grade album art component.
 *
 * Improvements over v1:
 * 1. Module-level URL cache — once a videoId's working thumbnail is found,
 *    subsequent mounts show it instantly (no flash, no spinner) even after
 *    navigating away and returning.
 * 2. Three-step quality fallback: hqdefault → sddefault → mqdefault → gradient.
 * 3. Gradient placeholder is deterministic per videoId — no blank/grey ever.
 * 4. No unnecessary re-fetches on re-mount.
 */
export function TrackImage({ videoId, title, className = '', style }: TrackImageProps) {
  // Deterministic unique gradient per videoId
  const hue = videoId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const hue2 = (hue + 70) % 360;
  const gradientBg = {
    background: `linear-gradient(135deg, hsl(${hue},50%,20%), hsl(${hue2},60%,28%))`,
  };

  const cached = resolvedUrls.get(videoId);

  // If we already resolved this videoId, use the result immediately
  const [src, setSrc] = useState<string | null>(
    cached && cached !== 'error' ? cached : null
  );
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    cached === 'error' ? 'error' : cached ? 'loaded' : 'loading'
  );
  const qualityIndexRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // When videoId changes (or on first mount with no cache), start resolution
  useEffect(() => {
    const existing = resolvedUrls.get(videoId);
    if (existing === 'error') {
      setStatus('error');
      setSrc(null);
      return;
    }
    if (existing) {
      setSrc(existing);
      setStatus('loaded');
      return;
    }

    // Start fresh resolution for this videoId
    qualityIndexRef.current = 0;
    setSrc(buildUrl(videoId, QUALITY_CHAIN[0]!));
    setStatus('loading');
  }, [videoId]);

  const tryNextQuality = () => {
    qualityIndexRef.current += 1;
    const nextQuality = QUALITY_CHAIN[qualityIndexRef.current];
    if (nextQuality && isMountedRef.current) {
      setSrc(buildUrl(videoId, nextQuality));
    } else {
      // All qualities exhausted
      resolvedUrls.set(videoId, 'error');
      if (isMountedRef.current) setStatus('error');
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth <= YT_STUB_WIDTH) {
      // YouTube's grey stub — try next quality
      tryNextQuality();
      return;
    }
    // Genuine image — cache and show it
    if (src) resolvedUrls.set(videoId, src);
    if (isMountedRef.current) setStatus('loaded');
  };

  const handleError = () => {
    tryNextQuality();
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ ...gradientBg, ...style }}
    >
      {/* Gradient placeholder — always shown until image loads */}
      {status !== 'loaded' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center z-0">
          <Music2 size={22} className="text-white/30 mb-1.5" />
          {title && (
            <span className="text-xs font-bold text-white/70 line-clamp-2 drop-shadow-md leading-tight">
              {title}
            </span>
          )}
          {status === 'loading' && (
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/50 animate-spin" />
          )}
        </div>
      )}

      {/* Actual image — overlaid, fades in when ready */}
      {src && status !== 'error' && (
        <img
          src={src}
          alt={title ?? ''}
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          draggable={false}
        />
      )}
    </div>
  );
}
