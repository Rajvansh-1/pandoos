import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { LyricsView } from './LyricsView';
import { TrackImage } from '@/components/shared/TrackImage';
import { SeekBar } from './SeekBar';
import { PlayerControls } from './PlayerControls';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { PandaMascot } from '@/features/panda/components/PandaMascot';

interface MobileLyricsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOptions?: () => void;
}

export function MobileLyricsScreen({ isOpen, onClose, onOpenOptions }: MobileLyricsScreenProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  useHardwareBack(isOpen, onClose);

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
            <button onClick={onOpenOptions} className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-90 transition-transform">
              <MoreVertical size={24} />
            </button>
          </div>

          {/* Lyrics Full Height View */}
          <div className="relative z-10 flex-1 min-h-0 w-full">
            <LyricsView />
          </div>

          {/* Sleek Controls Area */}
          <div className="relative z-10 w-full shrink-0 flex flex-col items-center justify-end px-6 pt-16 pb-[calc(env(safe-area-inset-bottom)+24px)] bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
            {/* Floating Panda giving mic */}
            <div className="absolute right-2 -top-24 flex items-end pointer-events-none opacity-90 drop-shadow-2xl scale-90 sm:scale-100 origin-bottom-right">
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.8 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
                className="bg-black/50 backdrop-blur-xl px-4 py-2 rounded-2xl rounded-br-sm border border-white/10 mb-8 -mr-6 z-20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest whitespace-nowrap">Sing along!</span>
              </motion.div>
              <PandaMascot size={110} emotion="singing" />
            </div>

            <SeekBar />
            
            <div className="w-full flex items-center justify-between mt-6">
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg border border-white/5">
                  <TrackImage videoId={currentTrack.videoId} title={currentTrack.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm truncate">{currentTrack.title}</h3>
                  <p className="text-white/60 text-xs truncate mt-0.5">{currentTrack.artist}</p>
                </div>
              </div>
              <PlayerControls className="scale-75 origin-right shrink-0" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
