import React from 'react';
import { cn } from '@/utils/cn';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track } from '@/types/track';

interface VinylRecordProps {
  track: Track | null;
  isPlaying: boolean;
  className?: string;
}

export function VinylRecord({ track, isPlaying, className }: VinylRecordProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center rounded-full shadow-vinyl z-10 w-full aspect-square max-w-full", className)}
    >
      {/* Dynamic Specular Highlight (The light hitting the record) - Doesn't spin */}
      <div 
        className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none z-20 opacity-70"
        style={{
          background: 'conic-gradient(from 120deg, transparent 0%, rgba(255,255,255,0.15) 10%, transparent 20%, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)'
        }}
      />
      
      {/* Outer Rim Light */}
      <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none z-30" />

      {/* The rotating record */}
      <div 
        className="w-full h-full rounded-full bg-[#0a0a0a] relative flex items-center justify-center overflow-hidden"
        style={{
          boxShadow: 'inset 0 0 10px rgba(0,0,0,1)',
          animation: 'spin-record 4s linear infinite',
          animationPlayState: isPlaying ? 'running' : 'paused'
        }}
      >
        {/* Vinyl Grooves Texture */}
        <div 
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background: 'repeating-radial-gradient(circle at center, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 3px, transparent 4px)',
          }}
        />

        {/* Inner Label Area */}
        <div 
          className="relative rounded-full overflow-hidden z-10 flex items-center justify-center bg-[#151515] shadow-lg"
          style={{ 
            width: '35%', 
            height: '35%',
            border: '2px solid rgba(255,255,255,0.05)',
            boxShadow: '0 0 15px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.8)'
          }}
        >
          {track ? (
            <TrackImage 
              videoId={track.videoId}
              title={track.title}
              className="w-full h-full object-cover saturate-150 contrast-125"
            />
          ) : (
            <div className="w-full h-full bg-surface-overlay flex items-center justify-center text-brand-primary opacity-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            </div>
          )}

          {/* Center spindle hole wrapper to add depth */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
               style={{ width: '14.28%', height: '14.28%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            {/* The actual hole (approx 30% of the wrapper) */}
            <div className="w-[30%] h-[30%] bg-[#0a0a0f] rounded-full border border-black/50 shadow-inner" />
          </div>
        </div>
      </div>
    </div>
  );
}
