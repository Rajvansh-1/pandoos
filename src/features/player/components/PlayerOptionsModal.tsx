import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ListPlus, Download, Moon, X, Check } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { TrackImage } from '@/components/shared/TrackImage';
import { AddToPlaylistModal } from '@/features/library/components/AddToPlaylistModal';

interface PlayerOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerOptionsModal({ isOpen, onClose }: PlayerOptionsModalProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);
  const sleepTimerEnd = usePlayerStore((s) => s.sleepTimerEnd);
  
  const likedSongs = useGamificationStore((s) => s.likedSongs);
  const toggleLike = useGamificationStore((s) => s.toggleLike);

  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  if (!currentTrack) return null;

  const isLiked = likedSongs.includes(currentTrack.id);

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    setDownloadState('downloading');
    // Mock download delay
    setTimeout(() => {
      setDownloadState('done');
    }, 2000);
  };

  const handleSetTimer = (minutes: number) => {
    setSleepTimer(minutes);
    setShowSleepMenu(false);
    onClose();
  };

  const sleepMinutesLeft = sleepTimerEnd ? Math.ceil((sleepTimerEnd - Date.now()) / 60000) : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Modal Sheet */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[201] max-w-lg mx-auto bg-[#0a0f0d] rounded-t-3xl border-t border-emerald-900/30 overflow-hidden pb-safe"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center py-4" onClick={onClose}>
                <div className="w-12 h-1.5 rounded-full bg-white/10" />
              </div>

              <div className="px-6 pb-8">
                {/* Header Track Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                  <TrackImage
                    videoId={currentTrack.videoId}
                    title={currentTrack.title}
                    className="w-14 h-14 rounded-lg object-cover shadow-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate">{currentTrack.title}</h3>
                    <p className="text-white/50 text-sm truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                {!showSleepMenu ? (
                  <div className="space-y-2">
                    {/* Like Button */}
                    <button 
                      onClick={() => toggleLike(currentTrack.id)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                    >
                      <Heart 
                        size={24} 
                        className={isLiked ? "text-red-500" : "text-white/60"} 
                        fill={isLiked ? "currentColor" : "none"} 
                      />
                      <span className={`text-base font-medium ${isLiked ? "text-red-500" : "text-white/80"}`}>
                        {isLiked ? 'Remove from Liked' : 'Like'}
                      </span>
                    </button>

                    {/* Add to Playlist */}
                    <button 
                      onClick={() => setIsPlaylistModalOpen(true)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                    >
                      <ListPlus size={24} className="text-white/60" />
                      <span className="text-base font-medium text-white/80">
                        Add to Playlist
                      </span>
                    </button>

                    {/* Download Mock */}
                    <button 
                      onClick={handleDownload}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {downloadState === 'done' ? (
                          <Check size={24} className="text-brand-primary" />
                        ) : (
                          <Download size={24} className={downloadState === 'downloading' ? "text-brand-primary animate-pulse" : "text-white/60"} />
                        )}
                        <span className={`text-base font-medium ${downloadState !== 'idle' ? "text-brand-primary" : "text-white/80"}`}>
                          {downloadState === 'idle' && 'Save to Bamboo Stash'}
                          {downloadState === 'downloading' && 'Downloading...'}
                          {downloadState === 'done' && 'Saved to Stash'}
                        </span>
                      </div>
                      {downloadState === 'downloading' && (
                        <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>

                    {/* Sleep Timer */}
                    <button 
                      onClick={() => setShowSleepMenu(true)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <Moon size={24} className={sleepTimerEnd ? "text-indigo-400" : "text-white/60"} fill={sleepTimerEnd ? "currentColor" : "none"} />
                        <span className={`text-base font-medium ${sleepTimerEnd ? "text-indigo-400" : "text-white/80"}`}>
                          Sleepy Panda Timer
                        </span>
                      </div>
                      {sleepMinutesLeft && (
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                          {sleepMinutesLeft}m left
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-4 mb-4">
                      <button onClick={() => setShowSleepMenu(false)} className="p-2 -ml-2 text-white/50 hover:text-white rounded-full">
                        <X size={20} />
                      </button>
                      <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Set Timer</span>
                    </div>
                    
                    {[5, 15, 30, 60].map((mins) => (
                      <button 
                        key={mins}
                        onClick={() => handleSetTimer(mins)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all"
                      >
                        <span className="text-base font-medium text-white/80">{mins} minutes</span>
                        <span className="text-lg opacity-80">🐼💤</span>
                      </button>
                    ))}
                    
                    {sleepTimerEnd && (
                      <button 
                        onClick={() => { clearSleepTimer(); setShowSleepMenu(false); onClose(); }}
                        className="w-full flex items-center justify-center px-4 py-3.5 mt-2 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.98] transition-all font-bold"
                      >
                        Turn Off Timer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddToPlaylistModal 
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          onClose(); // close options modal too
        }}
        track={currentTrack}
      />
    </>
  );
}
