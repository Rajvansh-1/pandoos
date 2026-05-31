import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, MoreVertical, Heart, X, Play, Shuffle, GripVertical, Trash2, ListMusic } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { useTasteStore } from '@/stores/useTasteStore';
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
import { LyricsView } from './LyricsView';
import { MobileLyricsScreen } from './MobileLyricsScreen';
import { TrackImage } from '@/components/shared/TrackImage';
import { cn } from '@/utils/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Track } from '@/types/track';
import { getRecommendations } from '@/services/recommendEngine';
import { useHardwareBack } from '@/hooks/useHardwareBack';

function DesktopQueueItem({ track, absoluteIndex, queue, playTrack, removeFromQueue, handleDragEnd }: any) {
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <Reorder.Item
      value={track}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); handleDragEnd(); }}
      dragListener={false}
      dragControls={dragControls}
      layout
      layoutId={track.videoId}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-2.5 px-2 py-2 rounded-xl group relative select-none"
      style={{
        background: isDragging ? 'rgba(255,255,255,0.12)' : 'transparent',
        boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)' : 'none',
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 99 : 'auto',
        transition: isDragging ? 'none' : 'background 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Drag Handle — always visible, clearly a handle */}
      <div
        className="shrink-0 flex flex-col items-center justify-center gap-[3px] px-1 py-2 cursor-grab active:cursor-grabbing touch-none rounded-md hover:bg-white/10 transition-colors"
        onPointerDown={(e) => { e.preventDefault(); dragControls.start(e); }}
        style={{ touchAction: 'none' }}
        title="Drag to reorder"
      >
        {/* Three-line drag indicator (more intuitive than a single grip icon) */}
        <span className="block w-3.5 h-[2px] rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
        <span className="block w-3.5 h-[2px] rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
        <span className="block w-3.5 h-[2px] rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
      </div>

      {/* Thumbnail */}
      <div
        className="relative w-10 h-10 shrink-0 cursor-pointer rounded-lg overflow-hidden shadow-md"
        onClick={() => playTrack(track, queue)}
      >
        <TrackImage
          videoId={track.videoId}
          title={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={14} className="text-white fill-white" />
        </div>
      </div>

      {/* Track info */}
      <div
        className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer"
        onClick={() => playTrack(track, queue)}
      >
        <h4 className="text-sm font-semibold truncate text-white leading-tight">{track.title}</h4>
        <p className="text-xs text-white/40 truncate mt-0.5">{track.artist}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (absoluteIndex >= 0) removeFromQueue(absoluteIndex); }}
        className="shrink-0 p-1.5 rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={13} />
      </button>
    </Reorder.Item>
  );
}


export function FullscreenPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isPlayerOpen = useUIStore((state) => state.isPlayerOpen);
  const closePlayer = useUIStore((state) => state.closePlayer);
  const sleepTimerEnd = usePlayerStore((state) => state.sleepTimerEnd);

  useHardwareBack(isPlayerOpen, closePlayer);

  const { data: isLiked } = useIsTrackLiked(currentTrack?.videoId || '');
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();

  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [visualMode, setVisualMode] = React.useState<'panda' | 'vinyl'>('vinyl');
  const trackEmotion = useTrackEmotion(currentTrack);

  const isDesktop = useMediaQuery('(min-width: 1024px)'); // lg breakpoint

  useColorExtractor();

  // Desktop Queue State
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const replaceQueue = usePlayerStore((s) => s.replaceQueue);

  const [localUpcoming, setLocalUpcoming] = useState<Track[]>([]);
  const [historyTracks, setHistoryTracks] = useState<Track[]>([]);

  // Desktop Tab State
  const [desktopRightTab, setDesktopRightTab] = useState<'upnext' | 'lyrics'>('upnext');

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'upnext' | 'related'>('upnext');
  const [isMobileLyricsOpen, setIsMobileLyricsOpen] = useState(false);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  React.useEffect(() => {
    if (mobileTab === 'related' && currentTrack) {
      setIsLoadingRelated(true);
      const getAffinityScore = useTasteStore.getState().getAffinityScore;
      const skippedIds = useTasteStore.getState().skippedIds;
      getRecommendations({
        currentTrack,
        history: historyTracks,
        skippedIds,
        getAffinityScore,
        count: 15
      }).then(tracks => {
        setRelatedTracks(tracks);
        setIsLoadingRelated(false);
      });
    }
  }, [mobileTab, currentTrack?.videoId]);

  React.useEffect(() => {
    setHistoryTracks(queue.slice(Math.max(0, queueIndex - 20), queueIndex));
    setLocalUpcoming(queue.slice(queueIndex + 1, queueIndex + 1 + 30));
  }, [queue, queueIndex]);

  const handleReorder = (newUpcoming: Track[]) => setLocalUpcoming(newUpcoming);
  const handleDragEnd = () => {
    const unrenderedTail = queue.slice(queueIndex + 1 + 30);
    const newQueue = [...queue.slice(0, queueIndex + 1), ...localUpcoming, ...unrenderedTail];
    replaceQueue(newQueue);
  };

  const MobilePlayerContent = (
    <div
      className="w-full h-full pb-safe relative z-10 overflow-y-auto scroll-container flex flex-col transition-colors duration-1000"
      style={{ background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.2) 0%, rgba(10, 5, 15, 0.98) 100%)' }}
    >
      {/* Mobile Player layout */}
      <div className="h-full min-h-full w-full flex flex-col shrink-0 pt-2">
        <div className="w-full flex items-center justify-between px-6 pt-safe mt-2 pb-2 shrink-0 z-50">
          <button onClick={closePlayer} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"><ChevronDown size={32} /></button>
          <span className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase text-center">Now Playing</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setVisualMode(v => v === 'vinyl' ? 'panda' : 'vinyl')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              {visualMode === 'vinyl' ? '🐼' : '💿'}
            </button>
            <button onClick={() => setIsOptionsOpen(true)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><MoreVertical size={24} /></button>
          </div>
        </div>
        <div className="flex-grow max-h-[4vh] shrink" />
        <div className="w-full flex-1 min-h-[150px] flex items-center justify-center relative px-6 py-2">
          <div
            className="relative flex items-center justify-center aspect-square mx-auto"
            style={{ height: '100%', maxHeight: '320px', maxWidth: '100%' }}
          >
            {visualMode === 'vinyl' ? (
              <div className="w-full h-full relative flex items-center justify-center">
                <VinylRecord track={currentTrack} isPlaying={isPlaying} className="z-10 shadow-2xl w-full h-full" />
                <Tonearm isPlaying={isPlaying} className="top-[-8%] right-[-8%]" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--color-primary)/0.3)] to-purple-900/30 rounded-[3rem] shadow-xl border border-white/5 transition-colors duration-1000">
                <PandaMascot size={240} emotion={trackEmotion} className="drop-shadow-2xl" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-grow max-h-[6vh] shrink" />
        <div className="w-full flex flex-col items-center justify-center gap-5 pb-6 px-6 shrink-0">
          <div className="flex flex-col w-full text-center items-center">
            <h2 className="text-2xl font-bold text-white truncate">{currentTrack?.title ?? 'Not Playing'}</h2>
            <p 
              className="text-base text-white/80 truncate mt-1 cursor-pointer hover:underline hover:text-white active:scale-95 transition-all relative z-50 px-2"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const artistId = currentTrack?.artistId;
                if (artistId) {
                  useUIStore.getState().openArtist(artistId);
                }
              }}
            >
              {currentTrack?.artist ?? 'Select a track'}
            </p>
          </div>
          <div className="w-full mt-2"><SeekBar /></div>
          <div className="w-full pb-4 pt-2 flex items-center justify-center"><PlayerControls /></div>
        </div>

        {/* Tab Bar */}
        <div className="w-full flex items-center justify-center gap-8 px-6 pb-4 shrink-0 border-b border-white/5">
          <button
            onClick={() => setMobileTab('upnext')}
            className={cn("text-xs font-bold uppercase tracking-widest transition-all px-2 py-2", mobileTab === 'upnext' ? "text-white border-b-2 border-white" : "text-white/40")}
          >
            Up Next
          </button>
          <button
            onClick={() => setIsMobileLyricsOpen(true)}
            className="text-xs font-bold uppercase tracking-widest text-white/40 transition-all px-2 py-2"
          >
            Lyrics
          </button>
          <button
            onClick={() => setMobileTab('related')}
            className={cn("text-xs font-bold uppercase tracking-widest transition-all px-2 py-2", mobileTab === 'related' ? "text-white border-b-2 border-white" : "text-white/40")}
          >
            Related
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mobileTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col transform-gpu will-change-transform will-change-opacity"
        >
          {/* Removed embedded lyrics view, replaced by fullscreen overlay */}

          {mobileTab === 'upnext' && (
            <div className="min-h-[60vh] w-full flex flex-col items-center pt-8 px-4 pb-32 shrink-0">
              <div className="w-full max-w-lg flex flex-col gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">

                {historyTracks.length > 0 && (
                  <div className="flex flex-col gap-1 pb-4 mb-4 border-b border-white/10">
                    <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2">Previously Played</h4>
                    {historyTracks.slice(-10).map((track, i) => (
                      <div key={`mob-hist-${track.videoId}-${i}`} className="flex items-center gap-3 p-2 rounded-xl bg-transparent opacity-50">
                        <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden" onClick={() => playTrack(track, queue)}>
                          <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => playTrack(track, queue)}>
                          <h4 className="text-sm font-bold truncate text-white">{track.title}</h4>
                          <p className="text-xs text-white/50 truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Reorder.Group axis="y" values={localUpcoming} onReorder={handleReorder} className="flex flex-col gap-1">
                  {localUpcoming.map((track) => (
                    <DesktopQueueItem
                      key={track.videoId} track={track} absoluteIndex={queue.findIndex(t => t.videoId === track.videoId)}
                      queue={queue} playTrack={playTrack} removeFromQueue={removeFromQueue} handleDragEnd={handleDragEnd}
                    />
                  ))}
                </Reorder.Group>
              </div>
            </div>
          )}

          {mobileTab === 'related' && (
            <div className="min-h-[60vh] w-full flex flex-col items-center pt-8 px-4 pb-32 shrink-0">
              {isLoadingRelated ? (
                <div className="text-white/50 text-sm font-medium tracking-widest uppercase animate-pulse pt-10">Fetching AI Recommendations...</div>
              ) : (
                <div className="w-full max-w-lg flex flex-col gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
                  <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2">Similar to {currentTrack?.title}</h4>
                  {relatedTracks.map((track, i) => (
                    <div key={`mob-rel-${track.videoId}-${i}`} className="flex items-center gap-3 p-2 rounded-xl bg-transparent hover:bg-white/10 transition-colors" onClick={() => playTrack(track, [track])}>
                      <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden">
                        <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate text-white">{track.title}</h4>
                        <p className="text-xs text-white/50 truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const DesktopPlayerModal = (
    <AnimatePresence>
      {isPlayerOpen && (
        <motion.div 
          className="fixed inset-0 z-[500] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0, pointerEvents: 'none' }}
          animate={{ opacity: 1, pointerEvents: 'auto' }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          onClick={closePlayer}
        >
          <motion.div
            className="relative w-full max-w-[1200px] h-[80vh] min-h-[600px] max-h-[800px] rounded-[2.5rem] overflow-hidden flex flex-col transition-colors duration-1000"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.2) 0%, rgba(10, 5, 15, 0.95) 100%)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)'
            }}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Custom Window Controls */}
            <div className="absolute top-6 left-6 z-50 flex gap-2">
              <button
                onClick={closePlayer}
                className="group w-4 h-4 rounded-full bg-white hover:bg-[hsl(var(--color-primary))] flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_15px_hsl(var(--color-primary))]"
              >
                <X size={10} strokeWidth={4} className="text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {/* Top Right Action */}
            <div className="absolute top-8 right-8 z-50">
              <button onClick={() => setVisualMode(v => v === 'vinyl' ? 'panda' : 'vinyl')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-md shadow-lg">
                {visualMode === 'vinyl' ? '🐼' : '💿'}
              </button>
            </div>

            <div className="flex w-full h-full p-8 pt-24 gap-8">

              {/* Left Column: Player & Controls */}
              <div className="flex-1 overflow-y-auto scroll-container flex flex-col items-center h-full pb-12">
                
                <div className="flex-1 w-full flex flex-col items-center justify-center pt-4">
                    {/* Visualizer Area */}
                    <div className="w-full flex-1 min-h-0 flex items-center justify-center relative max-w-[280px] max-h-[280px]">
                      <div className="relative w-full h-full aspect-square flex items-center justify-center">
                        {visualMode === 'vinyl' ? (
                          <><VinylRecord track={currentTrack} isPlaying={isPlaying} className="z-10 shadow-2xl" /><Tonearm isPlaying={isPlaying} className="top-[-8%] right-[-8%]" /></>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--color-primary)/0.3)] to-purple-900/30 rounded-[3rem] backdrop-blur-3xl shadow-[0_0_80px_rgba(var(--color-primary),0.2)] border border-white/5 transition-colors duration-1000">
                            <PandaMascot size={260} emotion={trackEmotion} className="drop-shadow-2xl" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Track Info & Controls */}
                    <div className="w-full max-w-[500px] mt-6 flex flex-col items-center shrink-0">
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-3xl font-display font-extrabold text-white truncate drop-shadow-md">{currentTrack?.title ?? 'Not Playing'}</h2>
                      <p 
                        className="text-lg text-white/60 truncate font-medium mt-1 cursor-pointer hover:underline hover:text-white active:scale-95 transition-all self-start relative z-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const artistId = currentTrack?.artistId;
                          if (artistId) {
                            useUIStore.getState().openArtist(artistId);
                          }
                        }}
                      >
                        {currentTrack?.artist ?? 'Select a track'}
                      </p>
                    </div>
                    {currentTrack && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => isLiked ? unlikeTrack.mutate(currentTrack.videoId) : likeTrack.mutate(currentTrack)} className="p-3 rounded-full hover:bg-white/10 transition-colors">
                          <Heart size={24} className={isLiked ? "text-[#ff5f56]" : "text-white/40"} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => setIsOptionsOpen(true)} className="p-3 rounded-full hover:bg-white/10 transition-colors text-white/40">
                          <MoreVertical size={24} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-full"><SeekBar /></div>
                  <div className="w-full mt-4"><PlayerControls className="w-full scale-110" /></div>
                  </div>
                </div>
              </div>

              {/* Right Column: Queue & Lyrics */}
              <div className="w-[400px] flex flex-col h-full bg-white/5 rounded-3xl border border-white/5 p-6 backdrop-blur-xl shadow-inner shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setDesktopRightTab('upnext')}
                      className={cn("text-lg font-bold tracking-tight transition-colors", desktopRightTab === 'upnext' ? "text-white" : "text-white/40 hover:text-white/70")}
                    >Up Next</button>
                    <button 
                      onClick={() => setDesktopRightTab('lyrics')}
                      className={cn("text-lg font-bold tracking-tight transition-colors", desktopRightTab === 'lyrics' ? "text-white" : "text-white/40 hover:text-white/70")}
                    >Lyrics</button>
                  </div>
                  {desktopRightTab === 'upnext' && (
                    <button className="text-xs font-semibold text-white/40 hover:text-white uppercase tracking-wider transition-colors">Clear</button>
                  )}
                </div>

                {desktopRightTab === 'upnext' ? (
                  <div className="flex-1 overflow-y-auto scroll-container -mx-2 px-2 flex flex-col">

                  {/* History List */}
                  {historyTracks.length > 0 && (
                    <div className="flex flex-col gap-1 pb-4 mb-4 border-b border-white/10">
                      <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest px-2 mb-2">Previously Played</h4>
                      {historyTracks.map((track, i) => (
                        <div
                          key={`hist-${track.videoId}-${i}`}
                          className="flex items-center gap-3 p-2 rounded-xl transition-all group relative overflow-hidden hover:bg-white/10 bg-transparent opacity-50 hover:opacity-100"
                        >
                          <div className="w-4 flex items-center justify-center shrink-0"></div>
                          <div className="relative w-10 h-10 shrink-0 cursor-pointer rounded-lg overflow-hidden shadow-md" onClick={() => playTrack(track, queue)}>
                            <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={16} className="text-white fill-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer" onClick={() => playTrack(track, queue)}>
                            <h4 className="text-sm font-bold truncate text-white">{track.title}</h4>
                            <p className="text-xs text-white/50 truncate">{track.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Up Next List */}
                  <Reorder.Group axis="y" values={localUpcoming} onReorder={handleReorder} className="flex flex-col gap-1 pb-4">
                    {localUpcoming.map((track) => (
                      <DesktopQueueItem
                        key={track.videoId} track={track} absoluteIndex={queue.findIndex(t => t.videoId === track.videoId)}
                        queue={queue} playTrack={playTrack} removeFromQueue={removeFromQueue} handleDragEnd={handleDragEnd}
                      />
                    ))}
                  </Reorder.Group>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden flex flex-col -mx-4 -mb-4">
                    <LyricsView />
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {isDesktop ? DesktopPlayerModal : (
        <BottomSheet isOpen={isPlayerOpen} onClose={closePlayer} fullScreen className="bg-black border-none shadow-none overflow-hidden">
          {MobilePlayerContent}
        </BottomSheet>
      )}
      <MobileLyricsScreen isOpen={isMobileLyricsOpen} onClose={() => setIsMobileLyricsOpen(false)} />
      <PlayerOptionsModal isOpen={isOptionsOpen} onClose={() => setIsOptionsOpen(false)} />
    </>
  );
}
