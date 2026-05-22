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

  // Auto-scroll logic
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
  }, [currentMs, lyrics]);

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
    let activeIndex = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return currentMs >= line.time && (!nextLine || currentMs < nextLine.time);
    });

    if (activeIndex === -1) activeIndex = 0;

    return (
      <div ref={containerRef} className="w-full h-full overflow-y-auto scroll-container px-6 py-[40%] relative no-select">
        <div className="flex flex-col gap-6 md:gap-8 pb-[50%]">
          {lyrics.map((line, i) => {
            const isActive = i === activeIndex;
            const isPassed = i < activeIndex;

            return (
              <motion.div
                key={i}
                ref={isActive ? activeLineRef : null}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isActive ? 1 : isPassed ? 0.4 : 0.2, y: 0 }}
                className="cursor-pointer"
                onClick={() => {
                  if (duration > 0) {
                    usePlayerStore.getState().setProgress(line.time / 1000 / duration);
                  }
                }}
              >
                <p className={`text-2xl md:text-4xl font-display font-extrabold tracking-tight transition-all duration-300 ease-out origin-left ${isActive ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'text-white'}`}>
                  {line.text || "♪"}
                </p>
              </motion.div>
            );
          })}
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
