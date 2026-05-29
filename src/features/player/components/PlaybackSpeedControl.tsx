import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { FastForward } from 'lucide-react';
import { cn } from '@/utils/cn';

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function PlaybackSpeedControl() {
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = usePlayerStore((s) => s.setPlaybackSpeed);

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-3">
        <FastForward size={18} className="text-white/60" />
        <span className="text-sm font-bold text-white/80">Playback Speed</span>
        <span className="ml-auto text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
          {playbackSpeed}x
        </span>
      </div>
      
      <div className="flex bg-white/5 rounded-xl p-1 gap-1 overflow-x-auto hide-scrollbar">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              playbackSpeed === speed
                ? "bg-brand-primary text-white shadow-md"
                : "text-white/40 hover:text-white/80 hover:bg-white/10"
            )}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
