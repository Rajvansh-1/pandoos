import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { TrackImage } from '@/components/shared/TrackImage';
import { useTrackEmotion } from '@/hooks/useTrackEmotion';
import { PandaMascot } from '@/features/panda/components/PandaMascot';

export function MiniPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const progress = usePlayerStore((state) => state.progress);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const openPlayer = useUIStore((state) => state.openPlayer);
  const trackEmotion = useTrackEmotion(currentTrack);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="w-full h-[var(--mini-player-height)] glass-mood rounded-xl overflow-hidden relative touch-none flex items-center shadow-lg will-animate"
        onClick={openPlayer}
      >
        {/* Background Progress Bar */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-brand-primary/80 transition-all duration-100 ease-linear z-10"
          style={{ width: `${progress * 100}%` }}
        />

        <div className="flex items-center w-full px-3 gap-3 z-20">
          {/* Thumbnail */}
          <div className="w-11 h-11 rounded-md overflow-hidden shrink-0 shadow-md">
            <TrackImage 
              videoId={currentTrack.videoId}
              title={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-sm font-semibold text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-text-muted truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Panda Mascot */}
          <div className="w-10 h-10 flex items-center justify-center shrink-0 -ml-2 pointer-events-none drop-shadow-md">
            <PandaMascot size={40} emotion={trackEmotion} />
          </div>

          {/* Play/Pause Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation(); // prevent opening the full player
              togglePlayPause();
            }}
            className="w-10 h-10 flex items-center justify-center text-white shrink-0 active:scale-90 transition-transform"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
