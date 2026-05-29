import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { LyricsView } from './LyricsView';
import { TrackImage } from '@/components/shared/TrackImage';
import { SeekBar } from './SeekBar';
import { PlayerControls } from './PlayerControls';

interface MobileLyricsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileLyricsScreen({ isOpen, onClose }: MobileLyricsScreenProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 z-[999] flex flex-col bg-black/90 backdrop-blur-3xl overflow-hidden touch-none"
          style={{
            background: 'linear-gradient(to bottom, hsl(var(--color-primary) / 0.3), #000000)'
          }}
        >
          {/* Blurred Background Art */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <TrackImage videoId={currentTrack.videoId} title={currentTrack.title} className="w-full h-full object-cover blur-[100px] scale-150" />
          </div>

          {/* Header */}
          <div className="relative z-10 w-full flex items-center justify-between px-6 pt-safe mt-4 pb-2 shrink-0">
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-90 transition-transform">
              <ChevronDown size={32} />
            </button>
            <span className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase text-center">Lyrics</span>
            <button className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-90 transition-transform">
              <MoreVertical size={24} />
            </button>
          </div>

          {/* Lyrics Full Height View */}
          <div className="relative z-10 flex-1 min-h-0 w-full">
            <LyricsView />
          </div>

          {/* Mini Controls Area */}
          <div className="relative z-10 w-full bg-black/40 backdrop-blur-xl border-t border-white/5 p-6 pb-safe shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 shadow-lg">
                <TrackImage videoId={currentTrack.videoId} title={currentTrack.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm truncate">{currentTrack.title}</h3>
                <p className="text-white/60 text-xs truncate">{currentTrack.artist}</p>
              </div>
              <PlayerControls className="scale-75 origin-right" />
            </div>
            <SeekBar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
