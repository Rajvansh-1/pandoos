import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Shuffle, Music, Disc, Users,
  ChevronRight, Share2, Heart, Radio, Mic2, MoreHorizontal
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useArtist } from '../hooks/useArtist';
import { useIsArtistFollowed, useFollowArtist, useUnfollowArtist } from '@/features/library/hooks/useLibrary';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import type { Track } from '@/types/track';
import { cn } from '@/utils/cn';

/* ─── helpers ─── */
function fmt(n?: number | string) {
  if (!n) return '';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return String(num);
}

// ytmusic-api song shape: { videoId, name, artist, album, thumbnails }
function songToTrack(s: any, fallbackArtistName?: string): Track {
  return {
    id: s.videoId,
    videoId: s.videoId,
    title: s.name ?? s.title ?? 'Unknown',
    artist: s.artist?.name ?? fallbackArtistName ?? 'Unknown',
    albumArt:
      s.thumbnails?.[1]?.url ??
      s.thumbnails?.[0]?.url ??
      `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`,
    duration: 0,
    source: 'youtube',
    artistId: s.artist?.artistId ?? null,
    albumId: s.album?.albumId ?? null,
  };
}

/* ─── Animated equalizer bars ─── */
function Equalizer() {
  return (
    <div className="flex items-end gap-[2px] h-4 w-4">
      {[0.4, 0.9, 0.6, 1, 0.7].map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-brand-primary rounded-sm"
          style={{
            height: `${h * 100}%`,
            animation: `equalizerBar 0.8s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.13}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Song row ─── */
function SongRow({ song, index, artistName, onPlay }: {
  song: any; index: number; artistName: string; onPlay: () => void;
}) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const isActive     = currentTrack?.videoId === song.videoId;
  const [hovered, setHovered] = useState(false);

  const thumb = song.thumbnails?.[1]?.url ?? song.thumbnails?.[0]?.url
    ?? `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all cursor-pointer select-none',
        isActive ? 'bg-white/10' : 'hover:bg-white/[0.06]'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      {/* index / play indicator */}
      <div className="w-7 text-center shrink-0">
        {hovered ? (
          <Play size={15} className="fill-white text-white mx-auto" />
        ) : isActive && isPlaying ? (
          <Equalizer />
        ) : (
          <span className={cn('text-sm font-medium', isActive ? 'text-brand-primary' : 'text-white/40')}>
            {index + 1}
          </span>
        )}
      </div>

      {/* thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-md">
        <img src={thumb} alt={song.name} className="w-full h-full object-cover" loading="lazy" />
      </div>

      {/* title + album */}
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-semibold truncate', isActive ? 'text-brand-primary' : 'text-white')}>
          {song.name}
        </div>
        <div className="text-xs text-white/45 truncate mt-0.5">
          {song.album?.name ?? artistName}
        </div>
      </div>

      {/* duration placeholder */}
      {song.duration && (
        <span className="text-xs text-white/30 tabular-nums shrink-0">{song.duration}</span>
      )}
    </div>
  );
}

/* ─── Album card ─── */
function AlbumCard({ album, onClick }: { album: any; onClick: () => void }) {
  // albumId is the key field from ytmusic-api
  const thumb = album.thumbnails?.[1]?.url ?? album.thumbnails?.[0]?.url;
  return (
    <div className="group w-36 sm:w-40 shrink-0 cursor-pointer snap-start" onClick={onClick}>
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2.5 shadow-lg bg-white/5">
        {thumb
          ? <img src={thumb} alt={album.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><Disc size={32} className="text-white/20" /></div>
        }
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center shadow-xl">
            <Play size={18} className="fill-white text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="text-white font-semibold text-sm truncate">{album.name}</div>
      {album.year && <div className="text-white/40 text-xs mt-0.5">{album.year}</div>}
    </div>
  );
}

/* ─── Related artist card ─── */
function RelatedCard({ artist, onClick }: { artist: any; onClick: () => void }) {
  const thumb = artist.thumbnails?.[1]?.url ?? artist.thumbnails?.[0]?.url;
  return (
    <div className="group flex flex-col items-center gap-2.5 shrink-0 cursor-pointer snap-start w-28" onClick={onClick}>
      <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-2 border-white/10 group-hover:border-brand-primary transition-all duration-300">
        {thumb
          ? <img src={thumb} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
          : <div className="w-full h-full bg-white/10 flex items-center justify-center"><Users size={28} className="text-white/30" /></div>
        }
      </div>
      <div className="text-white font-semibold text-xs text-center line-clamp-2 leading-tight">
        {artist.name}
      </div>
    </div>
  );
}

/* ─── Main overlay ─── */
export function ArtistOverlay() {
  const { activeArtistId, closeArtist, openAlbum } = useUIStore();
  const openArtist = useUIStore((s) => s.openArtist);
  const { data: artist, isLoading, error } = useArtist(activeArtistId);
  const playTrack = usePlayerStore((s) => s.playTrack);
  
  const { data: isFollowed } = useIsArtistFollowed(activeArtistId || '');
  const followArtist = useFollowArtist();
  const unfollowArtist = useUnfollowArtist();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);

  // ── Real field names from ytmusic-api ──
  const topSongs: any[]      = artist?.topSongs ?? [];
  const topAlbums: any[]     = artist?.topAlbums ?? [];
  const topSingles: any[]    = artist?.topSingles ?? [];
  const similarArtists: any[] = artist?.similarArtists ?? [];

  // Banner thumbnail (landscape). ytmusic-api returns wide banners.
  const bannerUrl = artist?.thumbnails?.[artist.thumbnails?.length - 1]?.url
    ?? artist?.thumbnails?.[0]?.url;

  const displayed = showAllSongs ? topSongs : topSongs.slice(0, 5);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setHeaderSolid(e.currentTarget.scrollTop > 220);
  };

  const handlePlaySong = (song: any) => {
    if (!song?.videoId) return;
    const queue = topSongs.filter((s) => s.videoId).map((s) => songToTrack(s, artist?.name));
    const idx   = queue.findIndex((t) => t.videoId === song.videoId);
    if (idx >= 0) playTrack(queue[idx]!, queue);
    else {
      const t = songToTrack(song, artist?.name);
      playTrack(t, [t]);
    }
  };

  const handleShuffleAll = () => {
    const queue = topSongs.filter((s) => s.videoId).map((s) => songToTrack(s, artist?.name));
    if (!queue.length) return;
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]!, shuffled);
  };

  // albumId is the correct field (not browseId) for ytmusic-api albums
  const getAlbumId = (album: any) => album.albumId ?? album.browseId;

  if (!activeArtistId) return null;

  return (
    <AnimatePresence>
      {activeArtistId && (
        <motion.div
          key="artist-overlay"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-[300] flex flex-col bg-[#080808]"
        >
          {/* ── Sticky floating header ── */}
          <motion.div
            animate={{ backgroundColor: headerSolid ? 'rgba(8,8,8,0.96)' : 'transparent' }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
            style={{ backdropFilter: headerSolid ? 'blur(24px)' : 'none' }}
          >
            <button
              onClick={closeArtist}
              className="w-11 h-11 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <motion.span animate={{ opacity: headerSolid ? 1 : 0 }} className="text-white font-bold text-sm truncate max-w-[200px]">
              {artist?.name}
            </motion.span>
            <div className="w-11 h-11" /> {/* Spacer for justify-between */}
          </motion.div>

          {/* ── Scrollable body ── */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">

            {/* Loading */}
            {isLoading && (
              <div className="h-screen flex flex-col items-center justify-center gap-6">
                <div className="relative"><div className="absolute inset-0 animate-ping rounded-full bg-brand-primary/20" /><PandaMascot size={90} emotion="focus" /></div>
                <p className="text-white/40 text-sm tracking-widest uppercase animate-pulse">Loading artist…</p>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="h-screen flex flex-col items-center justify-center gap-5 px-8 text-center">
                <PandaMascot size={90} emotion="heartbroken" />
                <p className="text-white font-bold">Artist not found</p>
                <p className="text-white/40 text-sm">The panda couldn't dig this one up.</p>
                <button onClick={closeArtist} className="mt-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-full">Go Back</button>
              </div>
            )}

            {/* ── Artist data ── */}
            {artist && (
              <div className="pb-56">

                {/* HERO — use banner as full-width bg, no separate "avatar" (API doesn't provide one separately) */}
                <div className="relative w-full min-h-[320px] sm:min-h-[380px] overflow-hidden flex items-end">
                  {bannerUrl
                    ? <>
                        <img src={bannerUrl} alt={artist.name} className="absolute inset-0 w-full h-full object-cover object-center" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-black/20" />
                      </>
                    : <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/40 via-purple-900/30 to-[#080808]" />
                  }

                  <div className="relative z-10 w-full px-5 pb-8 pt-16">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 bg-brand-primary text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Artist</span>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
                      {artist.name}
                    </h1>
                    {artist.subscribers && (
                      <p className="text-white/55 text-sm font-medium mt-2">{fmt(artist.subscribers)} subscribers / listeners</p>
                    )}
                  </div>
                </div>

                {/* ACTION BAR */}
                <div className="flex items-center gap-3 px-5 mt-5 mb-8">
                  <button
                    onClick={handleShuffleAll}
                    disabled={topSongs.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:opacity-90 active:scale-95 text-white font-bold rounded-full shadow-lg shadow-brand-primary/30 transition-all disabled:opacity-40"
                  >
                    <Shuffle size={18} />
                    Shuffle
                  </button>
                  <button 
                    onClick={() => {
                      if (!activeArtistId) return;
                      if (isFollowed) {
                        unfollowArtist.mutate(activeArtistId);
                      } else {
                        // Create a simple artist object for the library
                        followArtist.mutate({
                          id: activeArtistId,
                          name: artist.name,
                          thumbnail: bannerUrl
                        });
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all active:scale-95",
                      isFollowed 
                        ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                        : "bg-transparent text-white border border-white/40 hover:border-white"
                    )}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>

                {/* TOP SONGS — field: topSongs */}
                {topSongs.length > 0 && (
                  <section className="px-4 mb-10">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Music size={18} className="text-brand-primary" /> Popular Songs
                      </h2>
                      {topSongs.length > 5 && (
                        <button
                          onClick={() => setShowAllSongs((v) => !v)}
                          className="text-xs font-semibold text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          {showAllSongs ? 'Less' : `All ${topSongs.length}`}
                          <ChevronRight size={13} className={cn('transition-transform', showAllSongs && 'rotate-90')} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {displayed.map((song, i) => (
                        <SongRow
                          key={song.videoId ?? i}
                          song={song}
                          index={i}
                          artistName={artist.name}
                          onPlay={() => handlePlaySong(song)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ALBUMS — field: topAlbums, key: albumId */}
                {topAlbums.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-5">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Disc size={18} className="text-brand-primary" /> Albums
                      </h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto px-5 pb-3 snap-x" style={{ scrollbarWidth: 'none' }}>
                      {topAlbums.map((album) => (
                        <AlbumCard key={getAlbumId(album)} album={album} onClick={() => openAlbum(getAlbumId(album))} />
                      ))}
                    </div>
                  </section>
                )}

                {/* SINGLES — field: topSingles */}
                {topSingles.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-5">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Mic2 size={18} className="text-brand-primary" /> Singles & EPs
                      </h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto px-5 pb-3 snap-x" style={{ scrollbarWidth: 'none' }}>
                      {topSingles.map((s) => (
                        <AlbumCard key={getAlbumId(s)} album={s} onClick={() => openAlbum(getAlbumId(s))} />
                      ))}
                    </div>
                  </section>
                )}

                {/* SIMILAR ARTISTS — field: similarArtists, key: artistId */}
                {similarArtists.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-5">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={18} className="text-brand-primary" /> Fans Also Like
                      </h2>
                    </div>
                    <div className="flex gap-5 overflow-x-auto px-5 pb-3 snap-x" style={{ scrollbarWidth: 'none' }}>
                      {similarArtists.map((rel) => (
                        <RelatedCard
                          key={rel.artistId ?? rel.browseId}
                          artist={rel}
                          onClick={() => openArtist(rel.artistId ?? rel.browseId)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state — API returned data but sections are all empty */}
                {!topSongs.length && !topAlbums.length && !topSingles.length && (
                  <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
                    <PandaMascot size={80} emotion="chill" />
                    <p className="text-white/60 font-medium">Not much here yet.</p>
                    <p className="text-white/30 text-sm">This artist's catalogue isn't available through the current source.</p>
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
