import React from 'react';
import { ChevronDown, MoreVertical, Heart } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { useColorExtractor } from '@/features/player/hooks/useColorExtractor';
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from '@/features/library/hooks/useLibrary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useTrackEmotion } from '@/hooks/useTrackEmotion';
import { VinylRecord } from './VinylRecord';
import { Tonearm } from './Tonearm';
import { SeekBar } from './SeekBar';
import { PlayerControls } from './PlayerControls';
import { PlayerOptionsModal } from './PlayerOptionsModal';
import { PlayerQueueModal } from './PlayerQueueModal';
import { LyricsView } from './LyricsView';
import { ListMusic } from 'lucide-react';

export function FullscreenPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isPlayerOpen = useUIStore((state) => state.isPlayerOpen);
  const closePlayer = useUIStore((state) => state.closePlayer);
  const sleepTimerEnd = usePlayerStore((state) => state.sleepTimerEnd);
  
  const { data: isLiked } = useIsTrackLiked(currentTrack?.videoId || '');
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();

  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [isQueueOpen, setIsQueueOpen] = React.useState(false);
  const [visualMode, setVisualMode] = React.useState<'panda' | 'vinyl'>('vinyl');
  const trackEmotion = useTrackEmotion(currentTrack);

  // Mount the color extractor hook here so it runs when a track is active
  useColorExtractor();

  return (
    <BottomSheet 
      isOpen={isPlayerOpen} 
      onClose={closePlayer} 
      fullScreen 
      className="bg-black border-none shadow-none overflow-hidden"
    >
      {/* Dynamic Deep Base Gradient */}
      <div 
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={{
          background: `linear-gradient(to bottom, hsl(var(--color-primary) / 0.15) 0%, #000000 80%)`
        }}
      />

      {/* Animated Mesh/Bloom Layers */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] opacity-40 mix-blend-screen transition-colors duration-1000 animate-pulse-slow"
          style={{
            background: `radial-gradient(circle at 30% 30%, hsl(var(--color-primary) / 0.8) 0%, transparent 50%),
                         radial-gradient(circle at 70% 70%, hsl(var(--color-secondary) / 0.6) 0%, transparent 60%)`,
            filter: 'blur(100px)'
          }} 
        />
        <div 
          className="absolute top-0 inset-x-0 h-[60vh] mix-blend-screen opacity-20 transition-colors duration-1000 animate-pulse-slow"
          style={{
            background: `hsl(var(--color-primary))`,
            filter: 'blur(120px)',
            animationDelay: '1s' // Desync the pulse
          }} 
        />
      </div>

      {/* Premium Noise Overlay for Texture */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Main Content: Scrollable vertical stack */}
      <div className="w-full h-full pb-safe relative z-10 overflow-y-auto scroll-container flex flex-col">
        
        {/* Full Viewport 1: Main Player */}
        <div className="h-full min-h-full w-full flex flex-col shrink-0 pt-2">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between px-6 pt-safe mt-2 pb-2 shrink-0 z-50">
          <button 
            onClick={closePlayer}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 touch-highlight backdrop-blur-md"
            aria-label="Close Player"
          >
            <ChevronDown size={32} />
          </button>
          <span className="text-xs md:text-sm font-bold tracking-[0.2em] text-white/90 uppercase drop-shadow-lg text-center px-4 flex flex-col items-center gap-1">
            Now Playing
            {sleepTimerEnd && <span className="text-[10px] text-brand-primary normal-case tracking-normal">Sleep Timer Active 💤</span>}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (navigator.share && currentTrack) {
                  navigator.share({
                    title: `Listen to ${currentTrack.title} on Pandoos`,
                    text: `I'm vibing to ${currentTrack.title} by ${currentTrack.artist} on Pandoos!`,
                    url: window.location.href,
                  }).catch(console.error);
                } else {
                  alert("Sharing not supported on this browser.");
                }
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 touch-highlight backdrop-blur-md hidden sm:flex"
              aria-label="Share Track"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            <button 
              onClick={() => setVisualMode(v => v === 'vinyl' ? 'panda' : 'vinyl')}
              className={`h-10 px-3 md:px-4 rounded-full flex items-center gap-1.5 md:gap-2 font-bold text-xs md:text-sm transition-all duration-300 active:scale-95 touch-highlight border ${
                visualMode === 'vinyl' 
                  ? 'bg-gradient-to-r from-brand-primary via-purple-500 to-brand-secondary text-white border-white/30 hover:scale-105 shadow-glow-md' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border-transparent backdrop-blur-md'
              }`}
              aria-label="Toggle Visual Mode"
            >
              {visualMode === 'vinyl' ? (
                <>
                  <span className="text-base md:text-lg animate-bounce" style={{ animationDuration: '2s' }}>🐼</span>
                  <span className="hidden md:inline">Panda View</span>
                </>
              ) : (
                <>
                  <span className="text-base md:text-lg">💿</span>
                  <span className="hidden md:inline">Vinyl View</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setIsOptionsOpen(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 touch-highlight backdrop-blur-md"
            >
              <MoreVertical size={24} />
            </button>
          </div>
        </div>

        {/* Top Spacer */}
        <div className="flex-grow max-h-[4vh] shrink" />

        {/* Visual Area (Responsive Square constrained by height) */}
        <div className="w-full flex-1 min-h-0 flex items-center justify-center relative px-6">
          <div className="relative h-full max-h-[380px] md:max-h-[480px] aspect-square flex items-center justify-center max-w-full">
            {visualMode === 'vinyl' ? (
              <>
                <VinylRecord 
                  track={currentTrack} 
                  isPlaying={isPlaying} 
                  className="z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                />
                <Tonearm 
                  isPlaying={isPlaying} 
                  className="top-[-8%] right-[-8%]"
                />
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center transition-transform duration-500 ${isPlaying ? 'scale-105' : 'scale-100'}`}>
                <PandaMascot 
                  size={280} 
                  emotion={trackEmotion} 
                  className="drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                />
              </div>
            )}
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
                onClick={() => isLiked ? unlikeTrack.mutate(currentTrack.videoId) : likeTrack.mutate(currentTrack)}
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
          <div className="w-full max-w-lg pb-4 pt-2 flex items-center relative">
            <PlayerControls className="scale-105 md:scale-110 w-full" />
            <button 
              onClick={() => setIsQueueOpen(true)}
              className="absolute right-0 p-3 text-white/60 hover:text-white transition-colors active:scale-95 touch-highlight"
              aria-label="Open Queue"
            >
              <ListMusic size={24} />
            </button>
          </div>
        </div>
        </div>

        {/* Full Viewport 2: Lyrics Section (Scroll down to see) */}
        <div className="min-h-full w-full flex flex-col items-center justify-start pt-12 px-4 pb-24 shrink-0">
          <div className="flex flex-col items-center mb-8 animate-bounce opacity-50">
             <ChevronDown size={24} className="text-white" />
          </div>
          <h3 className="text-white/40 text-sm font-bold tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
            <ListMusic size={16} /> Lyrics
          </h3>
          <div className="w-full flex-1 max-h-[70vh] max-w-2xl mx-auto rounded-[2rem] overflow-hidden bg-black/20 backdrop-blur-xl border border-white/5 shadow-2xl">
            <LyricsView />
          </div>
        </div>

      </div>

      <PlayerOptionsModal 
        isOpen={isOptionsOpen} 
        onClose={() => setIsOptionsOpen(false)} 
      />
      <PlayerQueueModal 
        isOpen={isQueueOpen} 
        onClose={() => setIsQueueOpen(false)} 
      />
    </BottomSheet>
  );
}
