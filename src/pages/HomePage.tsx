import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Play, Sparkles, TrendingUp, Music, Clock, Zap, Brain, Moon, Compass, Heart, Radio, Flame, Mic2, Users } from 'lucide-react';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useSearch, useTrending } from '@/features/search/hooks/useSearch';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { useBeastOracle } from '@/features/search/hooks/useBeastOracle';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track } from '@/types/track';
import { IS_NATIVE } from '@/utils/isMobile';

const MOODS = [
  { id: 'bollywood', label: 'Bollywood 💫', query: 'bollywood pop romantic hits' },
  { id: 'desi', label: 'Desi Swag 🔥', query: 'desi hip hop punjabi swag' },
  { id: 'sufi', label: 'Sufi Soul 🕊️', query: 'sufi ghazal peaceful lo-fi' },
  { id: 'devotional', label: 'Devotional 🛕', query: 'bhakti bhajan devotional peaceful' },
  { id: 'chill', label: 'Chill 🍃', query: 'lofi chill relax aesthetic' },
  { id: 'energy', label: 'Energy ⚡', query: 'high energy upbeat edm hits' },
  { id: 'focus', label: 'Focus 🧠', query: 'deep focus ambient electronic' },
  { id: 'workout', label: 'Workout 🏋️', query: 'heavy workout gym phonk' },
  { id: 'latenight', label: 'Night 🌃', query: 'late night drive synthwave retro' },
  { id: 'happy', label: 'Happy ☀️', query: 'happy feel good uplifting pop' },
  { id: 'romantic', label: 'Romantic 💖', query: 'romantic love songs acoustic' },
  { id: 'heartbroken', label: 'Sad 🌧️', query: 'sad emotional acoustic' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};

export function HomePage() {
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [userInput, setUserInput] = useState('');
  const [greeting] = useState(getGreeting);
  const [showMore, setShowMore] = useState(false);

  const openChat = useUIStore(s => s.openChat);
  const playTrack = usePlayerStore(s => s.playTrack);
  const history = usePlayerStore(s => s.history);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const recordListenSession = useGamificationStore(s => s.recordListenSession);
  const user = useAuthStore(s => s.user);
  const topGenres = useTasteStore(s => s.topGenres);
  const lovedIds = useTasteStore(s => s.lovedIds);

  const quickPicks = useMemo(() => history.filter(t => t?.videoId).slice(0, 10), [history]);

  // ── PHASE 1: Only 3 API calls on mount (fast first render) ──
  const { data: moodTracks, isLoading: isMoodLoading } = useSearch(selectedMood.query);
  const { data: trendingTracks, isLoading: isTrendingLoading } = useTrending();
  const { data: oracleData, isLoading: isOracleLoading } = useBeastOracle();

  // ── PHASE 2: Load more only after user scrolls or waits ──
  const { data: bollywoodTracks, isLoading: isBollyLoading } = useSearch(
    'bollywood pop romantic hits', showMore
  );
  const { data: desiTracks, isLoading: isDesiLoading } = useSearch(
    'desi hip hop punjabi swag', showMore
  );
  const { data: chillTracks } = useSearch('lofi chill relax aesthetic', showMore);
  const { data: currentTrackMore } = useSearch(
    currentTrack ? `${currentTrack.artist} ${currentTrack.title}` : '', showMore && !!currentTrack
  );

  // Trigger phase 2 after 3 seconds (smooth UX, not immediate load)
  useEffect(() => {
    const t = setTimeout(() => setShowMore(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleMoodClick = useCallback((mood: typeof MOODS[0]) => {
    setSelectedMood(mood);
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    openChat(userInput);
    setUserInput('');
  };

  const handlePlay = useCallback((track: Track, list: Track[] = []) => {
    playTrack(track, list.length > 0 ? list : [track]);
    recordListenSession(0, selectedMood.id, list.length);
  }, [playTrack, recordListenSession, selectedMood.id]);

  const toTracks = (data: any): Track[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.songs || [];
  };

  // Deduplicate all visible tracks
  const seen = useMemo(() => {
    const s = new Set<string>();
    quickPicks.forEach(t => s.add(t.videoId));
    return s;
  }, [quickPicks]);

  const oraclePlaylists = oracleData?.oracle?.slice(0, 3) ?? [];

  return (
    <div className="w-full min-h-full pb-32 flex flex-col bg-[hsl(var(--surface-base))] overflow-x-hidden">
      <Helmet>
        <title>Pandoos | Where Pandas Vibe</title>
      </Helmet>

      {/* ── HEADER ── */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            {greeting}{user && <span className="text-brand-primary">, {user.username.split(' ')[0]}</span>}
            <span>👋</span>
          </h1>
          <p className="text-white/40 text-xs mt-0.5">
            {topGenres.length > 0 ? '✨ Personalized for your taste' : 'What are we feeling today?'}
          </p>
        </div>
        <div
          onClick={() => openChat()}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <PandaMascot size={40} emotion={selectedMood.id} />
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="px-4 mb-4">
        <form onSubmit={handleChatSubmit} className="relative">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Search or ask the Panda..."
            className="w-full bg-white/8 text-white placeholder-white/30 px-5 py-3.5 rounded-2xl border border-white/10 focus:outline-none focus:border-brand-primary text-sm transition-all"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 w-9 h-9 bg-brand-primary text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <Sparkles size={15} />
          </button>
        </form>
      </div>

      {/* ── MOOD CHIPS ── */}
      <div className="px-4 mb-5">
        <div className="flex overflow-x-auto gap-2 pb-1 scroll-container">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => handleMoodClick(mood)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                selectedMood.id === mood.id
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/70 border-white/10'
              }`}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT SECTIONS ── */}
      <div className="flex flex-col gap-7">

        {/* JUMP BACK IN */}
        {quickPicks.length > 0 && (
          <TrackRow
            title="Jump Back In"
            icon={Clock}
            tracks={quickPicks}
            isLoading={false}
            onPlay={handlePlay}
            lovedIds={lovedIds}
          />
        )}

        {/* MOOD MIX — always first, 1 of our 3 initial calls */}
        <TrackRow
          title={`${selectedMood.label.split(' ')[0]} Mix`}
          icon={Sparkles}
          tracks={toTracks(moodTracks)}
          isLoading={isMoodLoading}
          onPlay={handlePlay}
          lovedIds={lovedIds}
        />

        {/* ORACLE vibes (AI) */}
        {!isOracleLoading && oraclePlaylists.map((vibe, i) => (
          <TrackRow
            key={vibe.id}
            title={vibe.title}
            icon={Brain}
            tracks={vibe.songs.slice(0, 15)}
            isLoading={false}
            onPlay={handlePlay}
            lovedIds={lovedIds}
          />
        ))}

        {isOracleLoading && (
          <TrackRow title="AI Curated For Now" icon={Brain} tracks={[]} isLoading={true} onPlay={handlePlay} lovedIds={lovedIds} />
        )}

        {/* NOW PLAYING VIBE */}
        {currentTrack && toTracks(currentTrackMore).length > 0 && (
          <TrackRow
            title="Because You're Listening"
            icon={Radio}
            tracks={toTracks(currentTrackMore)}
            isLoading={false}
            onPlay={handlePlay}
            lovedIds={lovedIds}
          />
        )}

        {/* GLOBAL TRENDING */}
        <TrackRow
          title="Global Top Hits"
          icon={TrendingUp}
          tracks={toTracks(trendingTracks)}
          isLoading={isTrendingLoading}
          onPlay={handlePlay}
          lovedIds={lovedIds}
        />

        {/* PHASE 2: lazy loaded sections */}
        {showMore && (
          <>
            <TrackRow
              title="The Bollywood Gala"
              icon={Flame}
              tracks={toTracks(bollywoodTracks)}
              isLoading={isBollyLoading}
              onPlay={handlePlay}
              lovedIds={lovedIds}
            />
            <TrackRow
              title="The Desi Gully"
              icon={Zap}
              tracks={toTracks(desiTracks)}
              isLoading={isDesiLoading}
              onPlay={handlePlay}
              lovedIds={lovedIds}
            />
            <TrackRow
              title="Chill Zone"
              icon={Moon}
              tracks={toTracks(chillTracks)}
              isLoading={false}
              onPlay={handlePlay}
              lovedIds={lovedIds}
            />
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex flex-col items-center justify-center mt-12 mb-16 gap-3 opacity-80 px-4">
        <PandaMascot size={42} emotion="chill" />
        <p className="text-base font-bold italic text-white/60 text-center">
          "Life is short, relax like a Panda and enjoy music"
        </p>
      </div>
    </div>
  );
}

// ─── TrackRow — fast, no Framer Motion stagger on mobile ─────────────────────

function TrackRow({ title, icon: Icon, tracks, isLoading, onPlay, lovedIds }: {
  title: string;
  icon: any;
  tracks: Track[];
  isLoading: boolean;
  onPlay: (t: Track, list: Track[]) => void;
  lovedIds: string[];
}) {
  if (!isLoading && tracks.length === 0) return null;

  return (
    <section className="w-full">
      <div className="px-4 mb-3 flex items-center gap-2">
        <Icon size={16} className="text-white/60 shrink-0" />
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-3 px-4 scroll-container">
        {isLoading
          ? [...Array(6)].map((_, i) => (
            <div key={i} className="shrink-0 w-[130px]">
              <div className="w-full aspect-square rounded-xl bg-white/5 animate-pulse mb-2" />
              <div className="w-3/4 h-2.5 rounded bg-white/5 animate-pulse mb-1.5" />
              <div className="w-1/2 h-2.5 rounded bg-white/5 animate-pulse" />
            </div>
          ))
          : tracks.map((track) => (
            <TrackCard
              key={track.videoId}
              track={track}
              onPlay={() => onPlay(track, tracks)}
              isLoved={lovedIds.includes(track.videoId)}
            />
          ))
        }
      </div>
    </section>
  );
}

// ─── TrackCard — pure CSS hover, NO framer motion on mobile ──────────────────

const TrackCard = React.memo(function TrackCard({
  track,
  onPlay,
  isLoved,
}: {
  track: Track;
  onPlay: () => void;
  isLoved: boolean;
}) {
  return (
    <div
      className="shrink-0 w-[130px] cursor-pointer group"
      onClick={onPlay}
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-white/5 border border-white/5">
        <TrackImage
          videoId={track.videoId}
          title={track.title}
          className="w-full h-full object-cover"
        />
        {/* Play overlay — CSS only, no JS animation */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M5 3v18l15-9L5 3z"/></svg>
          </div>
        </div>
        {isLoved && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <Heart size={10} fill="white" className="text-white" />
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-white line-clamp-1">{track.title}</p>
      <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5">{track.artist}</p>
    </div>
  );
});
