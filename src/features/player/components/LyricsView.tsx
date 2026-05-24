import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { fetchLyrics } from '@/services/lyrics';
import type { LyricsLine } from '@/services/lyrics';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function LyricsView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  
  const [lyrics, setLyrics] = useState<LyricsLine[] | null>(null);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const currentMs = progress * duration * 1000;

  useEffect(() => {
    if (!currentTrack) return;
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');
      setLyrics(null);
      setPlainLyrics('');

      const cleanTitle = currentTrack!.title.replace(/\s*\(.*?\)\s*/g, '').replace(/ - .*/, '');
      const cleanArtist = currentTrack!.artist.replace(/ - Topic$/, '');

      try {
        const res = await fetchLyrics(cleanTitle, cleanArtist);
        if (isMounted) {
          if (res.synced && res.synced.length > 0) {
            setLyrics(res.synced);
          } else if (res.plain) {
            setPlainLyrics(res.plain);
          } else {
            setError("No lyrics found for this track.");
          }
        }
      } catch (err) {
        if (isMounted) setError("Failed to load lyrics.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [currentTrack]);

  const [offsetMs, setOffsetMs] = useState(0);

  // Reset offset when track changes
  useEffect(() => {
    setOffsetMs(0);
  }, [currentTrack?.videoId]);

  let activeIndex = 0;
  if (lyrics) {
    const adjustedMs = currentMs + offsetMs;
    activeIndex = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return adjustedMs >= line.time && (!nextLine || adjustedMs < nextLine.time);
    });
    if (activeIndex === -1) activeIndex = 0;
  }

  // Auto-scroll logic (Only runs when activeIndex changes!)
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;
      
      const scrollPos = activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;
      
      container.scrollTo({
        top: scrollPos,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
        <Loader2 className="animate-spin mb-2" size={32} />
        <span className="font-bold tracking-widest text-xs uppercase">Summoning Lyrics</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/50 px-8 text-center">
        <p className="font-bold text-lg leading-relaxed">{error}</p>
      </div>
    );
  }

  if (lyrics) {
    return (
      <div className="relative w-full h-full">
        {/* Sync Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/10 opacity-60 hover:opacity-100 transition-opacity">
          <button onClick={() => setOffsetMs(0)} className="text-white/40 hover:text-white p-1" title="Reset Sync">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button onClick={() => setOffsetMs(o => o - 500)} className="text-white/60 hover:text-white p-1" title="Delay Lyrics">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
          </button>
          <span className="text-[10px] font-mono text-white/80 w-10 text-center select-none">
            {offsetMs > 0 ? '+' : ''}{(offsetMs / 1000).toFixed(1)}s
          </span>
          <button onClick={() => setOffsetMs(o => o + 500)} className="text-white/60 hover:text-white p-1" title="Advance Lyrics">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        </div>

        <div ref={containerRef} className="w-full h-full overflow-y-auto scroll-container px-6 py-[40%] relative no-select">
          <div className="flex flex-col gap-6 md:gap-8 pb-[50%]">
            {lyrics.map((line, i) => {
              const isActive = i === activeIndex;

              return (
                <motion.div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
                  className="cursor-pointer"
                  onClick={() => {
                    if (duration > 0) {
                      usePlayerStore.getState().seekTo(line.time / 1000 / duration);
                    }
                  }}
                >
                  <p className={`text-3xl md:text-4xl font-display font-black tracking-tight transition-all duration-500 ease-out origin-left ${isActive ? 'text-white scale-110 drop-shadow-[0_0_25px_rgba(255,255,255,0.7)]' : 'text-white/30 blur-[1px] scale-95'}`}>
                    {line.text || "♪"}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (plainLyrics) {
    return (
      <div className="w-full h-full overflow-y-auto scroll-container px-6 py-12">
        <p className="whitespace-pre-line text-lg md:text-xl font-bold text-white/80 leading-relaxed text-center">
          {plainLyrics}
        </p>
      </div>
    );
  }

  return null;
}
