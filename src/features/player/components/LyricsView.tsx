/**
 * LyricsView.tsx — Production-grade lyrics display component.
 *
 * Key design decisions:
 * 1. useRef for scroll container — avoids re-renders on every scroll.
 * 2. requestAnimationFrame-based active-line detection (≤16ms precision)
 *    instead of 500ms store interval. The rAF loop reads from the store
 *    without subscribing, so it never triggers React re-renders.
 * 3. Scroll is performed imperatively with a custom easing function
 *    (no browser smooth-scroll which can lag/fight on mobile).
 * 4. Plain lyrics section has a gradient fade-out at bottom for polish.
 * 5. No offset buttons on desktop — removed per spec.
 * 6. Click-to-seek on any synced line.
 * 7. Framer Motion line transitions feel like Apple Music.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Music2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { fetchLyrics, type LyricsLine, type LyricsResult } from '@/services/lyrics';
import audioClock from '@/services/audioClock';

// ─────────────────────────────────────────────
// Custom smooth-scroll helper (no browser API — full control)
// Uses an ease-out-quart curve for a snappy but premium feel.
// ─────────────────────────────────────────────
function smoothScrollTo(
  container: HTMLElement,
  targetScrollTop: number,
  durationMs: number
): void {
  const start = container.scrollTop;
  const distance = targetScrollTop - start;
  if (Math.abs(distance) < 2) return; // Already there

  let startTime: number | null = null;

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  function step(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    container.scrollTop = start + distance * easeOutQuart(progress);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────
// Single synced lyric line component
// ─────────────────────────────────────────────
interface LyricLineProps {
  line: LyricsLine;
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
  lineRef?: React.RefCallback<HTMLButtonElement>;
}

function LyricLine({ line, isActive, isPast, onClick, lineRef }: LyricLineProps) {
  return (
    <button
      ref={lineRef}
      onClick={onClick}
      className="w-full text-left focus:outline-none group"
      aria-label={`Seek to: ${line.text}`}
    >
      <motion.p
        animate={{
          opacity: isActive ? 1 : isPast ? 0.25 : 0.4,
          scale: isActive ? 1 : 0.97,
          filter: isActive ? 'blur(0px)' : isPast ? 'blur(0.5px)' : 'blur(0px)',
        }}
        transition={{
          opacity: { duration: 0.3, ease: 'easeOut' },
          scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          filter: { duration: 0.3 },
        }}
        className={`
          py-1 leading-tight transition-colors duration-200
          font-display font-black tracking-tight
          text-2xl sm:text-3xl lg:text-4xl
          ${isActive
            ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]'
            : 'text-white group-hover:text-white/70'
          }
          ${line.text === '' ? 'min-h-[1.5rem]' : ''}
        `}
      >
        {line.text === '' ? (
          // Empty line = instrumental gap — show a subtle music note
          <span className="inline-flex items-center gap-1 opacity-30">
            <Music2 size={20} />
          </span>
        ) : (
          line.text
        )}
      </motion.p>
    </button>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function LyricsView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const duration = usePlayerStore((s) => s.duration);

  const [result, setResult] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // We track activeIndex in a ref for the rAF loop, and only push to state
  // at ~30fps to limit React re-renders.
  const activeIndexRef = useRef(-1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefsMap = useRef<Map<number, HTMLButtonElement>>(new Map());

  // ── Fetch lyrics when track changes ──────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;

    setIsLoading(true);
    setError('');
    setResult(null);
    setActiveIndex(-1);
    activeIndexRef.current = -1;
    lineRefsMap.current.clear();

    const rawTitle = currentTrack.title;
    const rawArtist = currentTrack.artist;
    const videoId = currentTrack.videoId;

    fetchLyrics(rawTitle, rawArtist, videoId)
      .then((res) => {
        if (cancelled) return;
        if (res.matchType === 'none' && !res.plain && (!res.synced || res.synced.length === 0)) {
          setError('No lyrics found for this track.');
        } else {
          setResult(res);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load lyrics.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentTrack?.videoId]);

  // ── rAF-based active line detection ─────────────────────────────────
  // We read progress & duration directly from the store (getState) to avoid
  // subscribing and causing re-renders on every store update.
  useEffect(() => {
    const lines: LyricsLine[] = result?.synced ?? [];
    if (lines.length === 0) return;

    let lastRenderTime = 0;

    function tick(ts: number) {
      rafRef.current = requestAnimationFrame(tick);

      // Read directly from the audioClock — updated at ~60fps by the audio engine,
      // bypassing the 500ms setInterval that caused the 200-500ms sync delay.
      const currentMs = audioClock.currentTimeMs;

      // Binary search for current line — O(log n)
      let lo = 0;
      let hi = lines.length - 1;
      let found = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid]!.time <= currentMs) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      if (found !== activeIndexRef.current) {
        activeIndexRef.current = found;
        setActiveIndex(found);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [result?.synced]);

  // ── Smooth auto-scroll to active line ────────────────────────────────
  const lastScrolledIndex = useRef(-1);
  useEffect(() => {
    if (activeIndex === lastScrolledIndex.current) return;
    lastScrolledIndex.current = activeIndex;

    const container = containerRef.current;
    const activeLine = lineRefsMap.current.get(activeIndex);
    if (!container || !activeLine) return;

    // Target: center the active line vertically in the container
    const target =
      activeLine.offsetTop -
      container.clientHeight / 2 +
      activeLine.clientHeight / 2;

    smoothScrollTo(container, target, 450);
  }, [activeIndex]);

  // ── Seek on click ────────────────────────────────────────────────────
  const handleSeek = useCallback(
    (line: LyricsLine) => {
      const dur = usePlayerStore.getState().duration;
      if (dur > 0) {
        usePlayerStore.getState().seekTo(line.time / 1000 / dur);
      }
    },
    []
  );

  // ── Render ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/50">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-xs font-bold tracking-[0.2em] uppercase">Fetching Lyrics</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Music2 size={40} className="text-white/20" />
        <p className="text-white/40 font-semibold text-sm leading-relaxed">{error}</p>
      </div>
    );
  }

  if (result?.synced && result.synced.length > 0) {
    const lines = result.synced;

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Top fade gradient */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/30 to-transparent z-10 pointer-events-none" />
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-none" />

        <div
          ref={containerRef}
          className="w-full h-full overflow-y-auto scroll-container px-5 py-0 no-select"
          style={{ paddingTop: '45%', paddingBottom: '50%' }}
        >
          <div className="flex flex-col gap-4 md:gap-6">
            {lines.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;

              return (
                <LyricLine
                  key={i}
                  line={line}
                  isActive={isActive}
                  isPast={isPast}
                  onClick={() => handleSeek(line)}
                  lineRef={(el) => {
                    if (el) lineRefsMap.current.set(i, el);
                    else lineRefsMap.current.delete(i);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (result?.plain) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
        <div className="w-full h-full overflow-y-auto scroll-container px-6 py-10">
          <p className="whitespace-pre-line text-base sm:text-lg font-semibold text-white/70 leading-loose text-center">
            {result.plain}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
