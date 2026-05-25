import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Shuffle, X, Clock, Music } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAlbum } from '../hooks/useAlbum';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import type { Track } from '@/types/track';
import { cn } from '@/utils/cn';

// ytmusic-api album schema:
// { albumId, name, playlistId, artist: { artistId, name }, year, thumbnails, songs[] }
// songs[]: { videoId, name, artist: { artistId, name }, album: { albumId, name }, duration (seconds), thumbnails[] }

function fmtDuration(seconds: number | null) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function songToTrack(s: any, albumThumb: string, albumArtistName: string): Track {
  return {
    id: s.videoId,
    videoId: s.videoId,
    title: s.name ?? 'Unknown',
    artist: s.artist?.name ?? albumArtistName ?? 'Unknown',
    albumArt: s.thumbnails?.[s.thumbnails.length - 1]?.url ?? albumThumb,
    duration: s.duration ?? 0,
    source: 'youtube',
    artistId: s.artist?.artistId ?? null,
    albumId: s.album?.albumId ?? null,
  };
}

export function AlbumOverlay() {
  const { activeAlbumId, closeAlbum, openArtist } = useUIStore();
  const { data: album, isLoading, error } = useAlbum(activeAlbumId);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [headerSolid, setHeaderSolid] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setHeaderSolid(e.currentTarget.scrollTop > 250);
  };

  if (!activeAlbumId) return null;

  // Correct field: album.name (not title), album.artist (not artists[])
  const albumThumb = album?.thumbnails?.[album.thumbnails.length - 1]?.url
    ?? album?.thumbnails?.[0]?.url ?? '';
  const albumArtistName = album?.artist?.name ?? '';
  const songs: any[] = album?.songs ?? [];

  const validSongs = songs.filter((s) => s.videoId);

  const buildQueue = (): Track[] =>
    validSongs.map((s) => songToTrack(s, albumThumb, albumArtistName));

  const handlePlaySong = (song: any) => {
    if (!song?.videoId) return;
    const queue = buildQueue();
    const idx = queue.findIndex((t) => t.videoId === song.videoId);
    if (idx >= 0) playTrack(queue[idx]!, queue);
  };

  const handlePlayAll = () => {
    const queue = buildQueue();
    if (queue.length) playTrack(queue[0]!, queue);
  };

  const handleShuffle = () => {
    const queue = buildQueue();
    if (!queue.length) return;
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]!, shuffled);
  };

  return (
    <AnimatePresence>
      {activeAlbumId && (
        <motion.div
          key="album-overlay"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-[310] flex flex-col bg-[#080808]"
        >
          {/* Floating header */}
          <motion.div
            animate={{ backgroundColor: headerSolid ? 'rgba(8,8,8,0.96)' : 'transparent' }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
            style={{ backdropFilter: headerSolid ? 'blur(24px)' : 'none' }}
          >
            <button
              onClick={closeAlbum}
              className="w-11 h-11 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <motion.span
              animate={{ opacity: headerSolid ? 1 : 0 }}
              className="text-white font-bold text-sm truncate max-w-[200px]"
            >
              {album?.name}
            </motion.span>
            <button
              onClick={closeAlbum}
              className="w-11 h-11 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            >
              <X size={20} />
            </button>
          </motion.div>

          {/* Scrollable body */}
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto">

            {/* Loading */}
            {isLoading && (
              <div className="h-screen flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-brand-primary/20" />
                  <PandaMascot size={90} emotion="chill" />
                </div>
                <p className="text-white/40 text-sm tracking-widest uppercase animate-pulse">Loading album…</p>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="h-screen flex flex-col items-center justify-center gap-5 px-8 text-center">
                <PandaMascot size={90} emotion="heartbroken" />
                <p className="text-white font-bold">Album not found</p>
                <p className="text-white/40 text-sm">The panda couldn't load this album.</p>
                <button onClick={closeAlbum} className="mt-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-full">Go Back</button>
              </div>
            )}

            {/* Album data */}
            {album && (
              <div className="pb-32">

                {/* HERO */}
                <div className="relative">
                  {/* Blurred background */}
                  <div className="absolute inset-0 overflow-hidden">
                    {albumThumb && (
                      <img src={albumThumb} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#080808]/70 to-[#080808]" />
                  </div>

                  <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 px-5 pt-20 pb-8">
                    {/* Cover art */}
                    <div className="w-52 h-52 sm:w-56 sm:h-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      {albumThumb
                        ? <img src={albumThumb} alt={album.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-white/10 flex items-center justify-center"><Music size={48} className="text-white/20" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left pb-1">
                      <span className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">
                        {album.type ?? 'Album'}
                      </span>
                      <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight line-clamp-3">
                        {album.name}
                      </h1>
                      {/* Artist name — use album.artist.name (singular) */}
                      {albumArtistName && (
                        <button
                          onClick={() => {
                            if (album.artist?.artistId) {
                              closeAlbum();
                              openArtist(album.artist.artistId);
                            }
                          }}
                          className="text-white/70 hover:text-white font-semibold text-lg mt-2 transition-colors"
                        >
                          {albumArtistName}
                        </button>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-white/40 text-sm">
                        {album.year && <span>{album.year}</span>}
                        {songs.length > 0 && <><span>•</span><span>{songs.length} songs</span></>}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 mt-6">
                        <button
                          onClick={handlePlayAll}
                          disabled={!validSongs.length}
                          className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:opacity-90 active:scale-95 text-white font-bold rounded-full shadow-lg shadow-brand-primary/30 transition-all disabled:opacity-40"
                        >
                          <Play size={18} className="fill-white" />
                          Play
                        </button>
                        <button
                          onClick={handleShuffle}
                          disabled={!validSongs.length}
                          className="flex items-center gap-2 px-5 py-3 border border-white/20 hover:border-white/50 active:scale-95 text-white font-bold rounded-full transition-all disabled:opacity-40"
                        >
                          <Shuffle size={16} />
                          Shuffle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRACKLIST */}
                <div className="px-4 mt-4">
                  {/* Header */}
                  <div className="flex items-center gap-4 px-3 py-2 mb-2 border-b border-white/5">
                    <div className="w-7 text-center text-white/30 text-xs">#</div>
                    <div className="flex-1 text-white/30 text-xs uppercase tracking-widest font-bold">Title</div>
                    <Clock size={13} className="text-white/30 shrink-0" />
                  </div>

                  {songs.length === 0 && (
                    <div className="text-center py-16 text-white/30 text-sm">No tracks available</div>
                  )}

                  {songs.map((song, i) => {
                    const isActive = currentTrack?.videoId === song.videoId;
                    const canPlay  = !!song.videoId;
                    const thumb    = song.thumbnails?.[0]?.url;

                    return (
                      <div
                        key={song.videoId ?? i}
                        onClick={() => canPlay && handlePlaySong(song)}
                        className={cn(
                          'group flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all select-none',
                          canPlay ? 'cursor-pointer hover:bg-white/[0.06]' : 'opacity-40 cursor-not-allowed',
                          isActive && 'bg-white/10'
                        )}
                      >
                        {/* Index */}
                        <div className="w-7 text-center shrink-0">
                          {isActive && isPlaying
                            ? <div className="flex items-end gap-[2px] h-4 justify-center">
                                {[0.4, 0.9, 0.6, 1].map((h, idx) => (
                                  <div key={idx} className="w-[3px] bg-brand-primary rounded-sm"
                                    style={{ height: `${h * 100}%`, animation: `equalizerBar 0.8s ease-in-out infinite alternate`, animationDelay: `${idx * 0.15}s` }} />
                                ))}
                              </div>
                            : <span className={cn('text-sm', isActive ? 'text-brand-primary font-bold' : 'text-white/40 group-hover:text-white')}>{i + 1}</span>
                          }
                        </div>

                        {/* Thumbnail */}
                        {thumb && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-md">
                            <img src={thumb} alt={song.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}

                        {/* Title + Artist */}
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-sm font-semibold truncate', isActive ? 'text-brand-primary' : 'text-white')}>
                            {song.name}
                          </div>
                          {song.artist?.name && (
                            <div className="text-xs text-white/40 truncate mt-0.5">{song.artist.name}</div>
                          )}
                        </div>

                        {/* Duration */}
                        {song.duration && (
                          <span className="text-xs text-white/30 tabular-nums shrink-0">
                            {fmtDuration(song.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Copyright / extra info */}
                {album.year && (
                  <div className="px-7 mt-8 text-white/20 text-xs">
                    © {album.year} {albumArtistName}
                  </div>
                )}

                {/* Panda footer */}
                <div className="flex flex-col items-center gap-2 py-10 opacity-25">
                  <PandaMascot size={36} emotion="happy" />
                  <span className="text-white/50 text-[10px] tracking-widest uppercase">Pandoos</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
