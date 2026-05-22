import React from 'react';
import { ChevronDown, MoreVertical, Heart } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useUIStore } from '@/stores/useUIStore';
import { useColorExtractor } from '@/features/player/hooks/useColorExtractor';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { VinylRecord } from './VinylRecord';
import { Tonearm } from './Tonearm';
import { SeekBar } from './SeekBar';
import { PlayerControls } from './PlayerControls';
import { PlayerOptionsModal } from './PlayerOptionsModal';

export function FullscreenPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isPlayerOpen = useUIStore((state) => state.isPlayerOpen);
  const closePlayer = useUIStore((state) => state.closePlayer);
  const sleepTimerEnd = usePlayerStore((state) => state.sleepTimerEnd);
  
  const likedSongs = useGamificationStore((state) => state.likedSongs);
  const toggleLike = useGamificationStore((state) => state.toggleLike);
  
  const isLiked = currentTrack ? likedSongs.includes(currentTrack.id) : false;

  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);

  // Mount the color extractor hook here so it runs when a track is active
  useColorExtractor();

  return (
    <BottomSheet 
      isOpen={isPlayerOpen} 
      onClose={closePlayer} 
      fullScreen 
      className="mood-bg border-none shadow-none"
    >
      {/* Top light bloom for extra pop */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-brand-primary blur-[100px] transition-colors duration-1000 ease-in-out pointer-events-none mix-blend-screen opacity-50 z-0" />


      {/* Main Content: Flexible vertical stack */}
      <div className="w-full h-full flex flex-col pb-safe">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-6 pt-safe mt-2 pb-2 shrink-0 z-50">
          <button 
            onClick={closePlayer}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 touch-highlight"
            aria-label="Close Player"
          >
            <ChevronDown size={32} />
          </button>
          <span className="text-xs md:text-sm font-bold tracking-[0.2em] text-brand-primary uppercase drop-shadow-lg text-center px-4 flex flex-col items-center gap-1">
            Now Playing
            {sleepTimerEnd && <span className="text-[10px] text-indigo-300 normal-case tracking-normal">Sleep Timer Active 💤</span>}
          </span>
          <button 
            onClick={() => setIsOptionsOpen(true)}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-all active:scale-95 touch-highlight"
          >
            <MoreVertical size={24} />
          </button>
        </div>

        {/* Top Spacer */}
        <div className="flex-grow max-h-[4vh] shrink" />

        {/* Massive Vinyl Player (Responsive Square constrained by height) */}
        <div className="w-full flex-1 min-h-0 flex items-center justify-center relative px-6">
          <div className="relative h-full max-h-[380px] md:max-h-[480px] aspect-square flex items-center justify-center max-w-full">
            <VinylRecord 
              track={currentTrack} 
              isPlaying={isPlaying} 
              className="z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            />
            <Tonearm 
              isPlaying={isPlaying} 
              className="top-[-8%] right-[-8%]"
            />
          </div>
        </div>

        {/* Middle Spacer */}
        <div className="flex-grow max-h-[6vh] shrink" />

        {/* Bottom Controls Area (Clean Stack) */}
        <div className="w-full flex flex-col items-center justify-center gap-5 pb-6 px-6 md:px-12 shrink-0">
          
          {/* Track Info & Like Button */}
          <div className="flex flex-col w-full max-w-lg text-center md:text-left md:flex-row md:items-end md:justify-between px-2">
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white truncate drop-shadow-xl tracking-tight">
                {currentTrack?.title ?? 'Not Playing'}
              </h2>
              <p className="text-base md:text-lg text-white/80 truncate drop-shadow-md font-semibold mt-1">
                {currentTrack?.artist ?? 'Select a track'}
              </p>
            </div>
            {currentTrack && (
              <button 
                onClick={() => toggleLike(currentTrack.id)}
                className="mt-4 md:mt-0 md:ml-4 self-center md:self-end p-3 rounded-full hover:bg-white/10 transition-colors active:scale-95 touch-highlight flex-shrink-0"
              >
                <Heart 
                  size={28} 
                  className={isLiked ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" : "text-white/60"} 
                  fill={isLiked ? "currentColor" : "none"} 
                />
              </button>
            )}
          </div>

          {/* SeekBar */}
          <div className="w-full max-w-lg mt-2">
            <SeekBar />
          </div>

          {/* Controls */}
          <div className="w-full max-w-lg pb-4 pt-2">
            <PlayerControls className="scale-105 md:scale-110" />
          </div>
        </div>
      </div>

      <PlayerOptionsModal 
        isOpen={isOptionsOpen} 
        onClose={() => setIsOptionsOpen(false)} 
      />
    </BottomSheet>
  );
}
