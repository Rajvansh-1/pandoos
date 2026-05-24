import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { cn } from '@/utils/cn';

export function PlayerControls({ className }: { className?: string }) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isLooping = usePlayerStore((state) => state.isLooping);
  const isShuffling = usePlayerStore((state) => state.isShuffling);
  const queue = usePlayerStore((state) => state.queue);

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const prevTrack = usePlayerStore((state) => state.prevTrack);
  const toggleLoop = usePlayerStore((state) => state.toggleLoop);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const hasNext = queue.length > 1;

  return (
    <div className={cn("flex items-center justify-between w-full max-w-[320px] mx-auto", className)}>
      {/* Shuffle Button */}
      <button 
        onClick={toggleShuffle}
        className={cn(
          "p-2 touch-highlight transition-all hover:scale-110",
          isShuffling ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/40 hover:text-white"
        )}
      >
        <Shuffle size={20} strokeWidth={2} />
      </button>

      {/* Prev Button */}
      <button 
        onClick={prevTrack}
        className="p-2 text-white hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] touch-highlight transition-all active:scale-90 hover:scale-110"
      >
        <SkipBack size={26} strokeWidth={2.5} fill="currentColor" />
      </button>

      {/* Play/Pause Button - Glassmorphism */}
      <button 
        onClick={togglePlayPause}
        disabled={isLoading}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 hover:scale-105",
          "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1),inset_0_0_20px_rgba(255,255,255,0.1)] text-white",
          isLoading && "opacity-80 scale-95"
        )}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause size={28} strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play size={28} strokeWidth={2.5} fill="currentColor" className="ml-1" />
        )}
      </button>

      {/* Next Button */}
      <button 
        onClick={nextTrack}
        disabled={!hasNext && !isLooping}
        className={cn(
          "p-2 text-white touch-highlight transition-all active:scale-90 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]",
          (!hasNext && !isLooping) && "opacity-30 hover:scale-100 hover:drop-shadow-none"
        )}
      >
        <SkipForward size={26} strokeWidth={2.5} fill="currentColor" />
      </button>

      {/* Loop Button */}
      <button 
        onClick={toggleLoop}
        className={cn(
          "p-2 touch-highlight transition-all hover:scale-110",
          isLooping ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/40 hover:text-white"
        )}
      >
        <Repeat size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
