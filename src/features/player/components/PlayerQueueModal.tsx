import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { X, Play, Shuffle, GripVertical, Trash2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackImage } from '@/components/shared/TrackImage';
import { cn } from '@/utils/cn';
import type { Track } from '@/types/track';

interface PlayerQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function QueueItem({ track, absoluteIndex, queue, playTrack, removeFromQueue, handleDragEnd }: any) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item 
      value={track}
      onDragEnd={handleDragEnd}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-2xl transition-all group relative overflow-hidden hover:bg-white/5 bg-transparent"
      whileDrag={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)", zIndex: 50, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
    >
      <div 
        className="p-3 -ml-3 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center shrink-0"
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
      >
        <GripVertical size={20} />
      </div>
      
      {/* Track Image */}
      <div 
        className="relative w-12 h-12 shrink-0 cursor-pointer rounded-xl overflow-hidden shadow-md"
        onClick={() => playTrack(track, queue)}
      >
        <TrackImage 
          videoId={track.videoId} 
          title={track.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>

      {/* Track Info */}
      <div 
        className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer py-1"
        onClick={() => playTrack(track, queue)}
      >
        <h4 className="text-base font-bold truncate text-white">
          {track.title}
        </h4>
        <p className="text-sm text-white/50 truncate">
          {track.artist}
        </p>
      </div>

      {/* Remove Control */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (absoluteIndex >= 0) removeFromQueue(absoluteIndex);
          }}
          className="p-2 rounded-full text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors touch-highlight"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function PlayerQueueModal({ isOpen, onClose }: PlayerQueueModalProps) {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const replaceQueue = usePlayerStore((s) => s.replaceQueue);
  const isShuffling = usePlayerStore((s) => s.isShuffling);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // Use local state for dragging to guarantee 60fps smoothness
  const [localUpcoming, setLocalUpcoming] = useState<Track[]>([]);

  // Sync local state when the underlying global queue changes
  React.useEffect(() => {
    setLocalUpcoming(queue.slice(queueIndex + 1));
  }, [queue, queueIndex]);

  const handleReorder = (newUpcoming: Track[]) => {
    // Update local state instantly during drag
    setLocalUpcoming(newUpcoming);
  };

  const handleDragEnd = () => {
    // Commit to global store only when drag is finished
    const newQueue = [...queue.slice(0, queueIndex + 1), ...localUpcoming];
    replaceQueue(newQueue);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[201] h-[85vh] bg-[#0a0f0d] rounded-t-3xl border-t border-emerald-900/30 flex flex-col pb-safe overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Up Next</h2>
                <p className="text-sm text-brand-primary font-medium">Endless Radio Active 🐼</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-4 flex items-center gap-4 shrink-0">
              <button 
                onClick={toggleShuffle}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg",
                  isShuffling 
                    ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                    : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Shuffle size={20} strokeWidth={isShuffling ? 3 : 2} />
                {isShuffling ? 'Shuffle On' : 'Shuffle'}
              </button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 scrollbar-hide">
              {/* Currently Playing Track */}
              {currentTrack && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 mb-2 relative overflow-hidden shadow-lg border border-white/5">
                  <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow-md">
                    <TrackImage videoId={currentTrack.videoId} title={currentTrack.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-brand-primary/80 flex items-center justify-center">
                      <div className="w-5 h-5 flex items-end justify-center gap-0.5">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-white rounded-t-sm" />
                        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1 bg-white rounded-t-sm" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-white rounded-t-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-base font-bold truncate text-brand-primary">
                      {currentTrack.title}
                    </h4>
                    <p className="text-sm text-white/50 truncate">
                      {currentTrack.artist}
                    </p>
                  </div>
                  <div className="px-2 text-xs font-bold text-brand-primary uppercase tracking-widest">Now Playing</div>
                </div>
              )}

              {/* Up Next List (Draggable) */}
              <Reorder.Group axis="y" values={localUpcoming} onReorder={handleReorder} className="space-y-1">
                {localUpcoming.map((track) => {
                  const absoluteIndex = queue.findIndex(t => t.videoId === track.videoId);
                  return (
                    <QueueItem
                      key={track.videoId}
                      track={track}
                      absoluteIndex={absoluteIndex}
                      queue={queue}
                      playTrack={playTrack}
                      removeFromQueue={removeFromQueue}
                      handleDragEnd={handleDragEnd}
                    />
                  );
                })}
              </Reorder.Group>
              
              {/* Loader indicator for endless radio */}
              <div className="flex items-center justify-center py-6 text-white/30 gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <Shuffle size={16} />
                </motion.div>
                <span className="text-sm font-medium">Endless Radio is fetching more...</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
