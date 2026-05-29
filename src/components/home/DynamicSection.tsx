import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useInfiniteSection } from '@/hooks/useInfiniteSection';
import { TrackImage } from '@/components/shared/TrackImage';
import type { PandoosSection } from '@/services/pandoosBrain';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import type { Track } from '@/types/track';

interface DynamicSectionProps {
  section: PandoosSection;
  globalSeen: Set<string>;
}

export function DynamicSection({ section, globalSeen }: DynamicSectionProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteSection({ query: section.query });
  
  const playTrack = usePlayerStore(s => s.playTrack);
  const recordListenSession = useGamificationStore(s => s.recordListenSession);

  // Global Deduplication: Only return tracks that haven't been seen anywhere on the home page yet
  const uniqueTracks = useMemo(() => {
    if (!data) return [];
    const allTracks = data.pages.flat();
    const unique = allTracks.filter(t => {
      if (globalSeen.has(t.videoId)) return false;
      globalSeen.add(t.videoId);
      return true;
    });
    return unique;
  }, [data, globalSeen]);

  if (isLoading) {
    return (
      <section className="mb-10 w-full pl-4 md:pl-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full skeleton" />
          <div className="w-48 h-6 rounded-md skeleton" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[140px] md:min-w-[180px]">
              <div className="w-full aspect-square rounded-2xl skeleton mb-3" />
              <div className="w-3/4 h-4 skeleton mb-2 rounded" />
              <div className="w-1/2 h-3 skeleton rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (uniqueTracks.length === 0) return null;

  return (
    <section className="mb-10 w-full pl-4 md:pl-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{section.emoji}</span>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{section.title}</h2>
      </div>
      <p className="text-sm text-white/50 mb-4 ml-1">{section.description}</p>
      
      <div className="flex overflow-x-auto scroll-container gap-4 pb-4 pr-4 -ml-4 pl-4 snap-x">
        {uniqueTracks.map((track, idx) => (
          <motion.div
            key={`${track.videoId}-${idx}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="min-w-[140px] w-[140px] md:min-w-[180px] md:w-[180px] group cursor-pointer snap-start"
            onClick={() => {
              playTrack(track, uniqueTracks);
              recordListenSession(0, 'pandoos_brain', uniqueTracks.length);
            }}
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:shadow-xl transition-shadow glass">
              <TrackImage 
                videoId={track.videoId}
                title={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-sm md:text-base text-white truncate group-hover:text-[hsl(var(--color-primary))] transition-colors">
              {track.title}
            </h3>
            <p className="text-xs md:text-sm text-white/60 truncate mt-1">
              {track.artist}
            </p>
          </motion.div>
        ))}

        {/* Endless "+More" Button */}
        {hasNextPage && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              fetchNextPage();
            }}
            disabled={isFetchingNextPage}
            className="min-w-[140px] w-[140px] md:min-w-[180px] md:w-[180px] aspect-square rounded-2xl glass flex flex-col items-center justify-center gap-3 text-white/50 hover:text-white/90 hover:bg-white/5 transition-all snap-start shadow-md"
          >
            {isFetchingNextPage ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full"
              />
            ) : (
              <>
                <Plus size={32} />
                <span className="text-sm font-medium">Load More</span>
              </>
            )}
          </motion.button>
        )}
      </div>
    </section>
  );
}
