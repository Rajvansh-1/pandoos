import React from 'react';
import { Maximize2, ListMusic, Volume2, Heart } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { PlayerControls } from './PlayerControls';
import { SeekBar } from './SeekBar';
import { cn } from '@/utils/cn';
import { TrackImage } from '@/components/shared/TrackImage';
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from '@/features/library/hooks/useLibrary';

export function DesktopPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const openPlayer = useUIStore((state) => state.openPlayer);
  const toggleQueue = useUIStore((state) => state.toggleQueue);
  
  const { data: isLiked } = useIsTrackLiked(currentTrack?.videoId || '');
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[90px] bg-[#111]/95 backdrop-blur-xl border-t border-white/5 z-40 flex items-center px-4 justify-between">
      
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-[30%] min-w-[200px]">
        <div className="relative w-14 h-14 rounded-md overflow-hidden group shadow-md shrink-0">
          <TrackImage
            videoId={currentTrack.videoId}
            title={currentTrack.title}
            className="w-full h-full object-cover"
          />
          <button 
            onClick={openPlayer}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            <Maximize2 size={18} className="text-white" />
          </button>
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="text-sm font-bold text-white truncate cursor-pointer hover:underline">
            {currentTrack.title}
          </h4>
          <p className="text-xs text-white/60 truncate cursor-pointer hover:underline mt-0.5">
            {currentTrack.artist}
          </p>
        </div>
        <button 
          onClick={() => isLiked ? unlikeTrack.mutate(currentTrack.videoId) : likeTrack.mutate(currentTrack)}
          className="text-white/50 hover:text-white transition-colors ml-2"
        >
          <Heart size={18} className={isLiked ? "text-brand-primary" : ""} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Center: Controls & Seekbar */}
      <div className="flex flex-col items-center justify-center w-[40%] max-w-[600px] gap-2">
        <div className="scale-90">
          <PlayerControls />
        </div>
        <div className="w-full flex items-center justify-center">
          <SeekBar />
        </div>
      </div>

      {/* Right: Extra Controls */}
      <div className="flex items-center justify-end gap-4 w-[30%] min-w-[200px]">
        <button onClick={toggleQueue} className="text-white/50 hover:text-white transition-colors">
          <ListMusic size={20} />
        </button>
        
        {/* Mock Volume Control */}
        <div className="flex items-center gap-2 group">
          <Volume2 size={20} className="text-white/50 group-hover:text-white transition-colors" />
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
            <div className="h-full bg-white/70 rounded-full w-[80%] group-hover:bg-brand-primary transition-colors" />
          </div>
        </div>

        <button 
          onClick={openPlayer}
          className="text-white/50 hover:text-white transition-colors ml-2"
          title="Fullscreen Player"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
