import React, { useRef, useState, useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatTimePadded } from '@/utils/formatTime';
import { cn } from '@/utils/cn';

export function SeekBar({ className }: { className?: string }) {
  const progress = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const seekTo = usePlayerStore((state) => state.seekTo);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Use the dragged progress if user is dragging, otherwise the actual playback progress
  const displayProgress = isDragging ? dragProgress : progress;
  const currentTime = displayProgress * duration;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration === 0) return;
    setIsDragging(true);
    updateProgressFromEvent(e.clientX);
    
    // Capture pointer to track dragging outside the element
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    updateProgressFromEvent(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    containerRef.current.releasePointerCapture(e.pointerId);
    
    // Commit the seek
    seekTo(dragProgress);
  };

  const updateProgressFromEvent = (clientX: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setDragProgress(x / rect.width);
  };

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Time labels */}
      <div className="flex justify-between items-center text-xs text-text-muted font-mono px-1 select-none">
        <span>{formatTimePadded(currentTime)}</span>
        <span>{formatTimePadded(duration)}</span>
      </div>

      {/* The Bar */}
      <div 
        ref={containerRef}
        className="seek-bar h-8 flex items-center group touch-none relative cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Base Track (Sleek Grey Line) */}
        <div 
          className={cn(
            "w-full bg-white/20 rounded-full relative transition-all duration-300 ease-out",
            isDragging ? "h-1.5" : "h-1 group-hover:h-1.5"
          )}
        >
          {/* Played Portion (Sleek Pink/Red Line) */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-[#ff5f56] rounded-full"
            style={{ 
              width: `${displayProgress * 100}%`,
              transition: isDragging ? 'none' : 'width 0.1s linear',
              boxShadow: '0 0 10px rgba(255, 95, 86, 0.5)'
            }}
          />
        </div>
        
        {/* Playhead thumb (Clean White Dot) */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white shadow-md z-10 transition-transform duration-200",
            isDragging ? "scale-125" : "scale-0 group-hover:scale-100"
          )}
          style={{ left: `${displayProgress * 100}%` }}
        />
      </div>
    </div>
  );
}
