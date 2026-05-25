import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, TrendingUp, Music, Clock, Zap, Brain, Dumbbell, Moon, Compass, Heart, Radio, Flame, Mic2, Users } from 'lucide-react';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useSearch, useTrending } from '@/features/search/hooks/useSearch';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { buildSearchQuery, rankOracleVibes } from '@/services/recommendEngine';
import { useBeastOracle } from '@/features/search/hooks/useBeastOracle';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track, Artist } from '@/types/track';
import { useInView } from '@/hooks/useInView';
import { PandaChatModal } from '@/features/panda/components/PandaChatModal';
import { useWeatherContext } from '@/hooks/useWeatherContext';

// Stable session seed so shuffles are consistent until page refresh
const SESSION_SEED = Date.now();

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
  { id: 'sleepy', label: 'Sleepy 💤', query: 'sleep ambient delta waves' },
];

const GENRE_LABELS: Record<string, string> = {
  bollywood: 'Bollywood 💫', desi: 'Desi 🔥', punjabi: 'Punjabi 🎵',
  sufi: 'Sufi 🕊️', devotional: 'Devotional 🛕', lofi: 'Lo-Fi 🍃', electronic: 'Electronic ⚡',
  rock: 'Rock 🎸', acoustic: 'Acoustic 🎻', pop: 'Pop ✨',
};

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};

export function HomePage() {
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [customQuery, setCustomQuery] = useState(MOODS[0].query);
  const [userInput, setUserInput] = useState('');
  const [greeting] = useState(getGreeting);
  const [hasManuallyChangedMood, setHasManuallyChangedMood] = useState(false);

  const weather = useWeatherContext();

  // Weather-based auto-mood
  useEffect(() => {
    if (weather.isLoading || weather.error || hasManuallyChangedMood) return;

    let suggestedMood = MOODS[0];
    const hour = new Date().getHours();

    if (weather.isRaining) suggestedMood = MOODS.find(m => m.id === 'chill') || MOODS[0];
    else if (weather.isSunny) suggestedMood = MOODS.find(m => m.id === 'happy') || MOODS[0];
    else if (hour >= 22 || hour <= 4) suggestedMood = MOODS.find(m => m.id === 'latenight') || MOODS[0];
    else if (hour >= 5 && hour <= 9) suggestedMood = MOODS.find(m => m.id === 'focus') || MOODS[0];

    setSelectedMood(suggestedMood);
    setCustomQuery(suggestedMood.query);
  }, [weather.isLoading, weather.error, hasManuallyChangedMood]);

  // Panda Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState('');

  const playTrack = usePlayerStore(s => s.playTrack);
  const history = usePlayerStore(s => s.history);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const recordListenSession = useGamificationStore(s => s.recordListenSession);
  const user = useAuthStore(s => s.user);

  // Taste profile
  const topGenres = useTasteStore(s => s.topGenres);
  const recentArtists = useTasteStore(s => s.recentArtists);
  const lovedIds = useTasteStore(s => s.lovedIds);

  const isPersonalized = topGenres.length > 0 || recentArtists.length > 0;

  // Quick picks from history
  const quickPicks = useMemo(() => history.slice(0, 12), [history]);

  // "For You" — seeded from top genre
  const forYouQuery = useMemo(() => {
    if (topGenres[0] === 'bollywood') return 'bollywood pop romantic hits';
    if (topGenres[0] === 'desi' || topGenres[0] === 'punjabi') return 'desi hip hop punjabi swag';
    if (topGenres[0] === 'sufi') return 'sufi ghazal peaceful lo-fi';
    if (topGenres[0] === 'devotional') return 'bhakti bhajan devotional peaceful';
    if (topGenres[0] === 'lofi') return 'lofi chill relax aesthetic';
    if (topGenres[0] === 'rock') return 'rock alternative best hits';
    if (topGenres[0] === 'electronic') return 'high energy upbeat edm hits';
    return customQuery;
  }, [topGenres, customQuery]);

  const recentArtist = recentArtists[0] ?? (history[0]?.artist ?? null);
  const artistDisplayName = recentArtist
    ? recentArtist.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  const nowVibeQuery = useMemo(() => {
    if (!currentTrack) return null;
    return buildSearchQuery(currentTrack);
  }, [currentTrack?.videoId]);

  const { ref: loadMoreRef, isInView: shouldLoadMore } = useInView({ rootMargin: '600px' });

  // Immediate Searches
  const { data: nowVibeTracks, isLoading: isNowVibeLoading } = useSearch(nowVibeQuery ?? '');
  const { data: forYouTracks, isLoading: isForYouLoading } = useSearch(isPersonalized ? forYouQuery : '');
  const { data: moodTracks, isLoading: isMoodLoading } = useSearch(customQuery);
  const { data: artistTracks, isLoading: isArtistLoading } = useSearch(recentArtist ? `${recentArtist} top songs` : '');
  
  // Podcasts & Artists
  const { data: podcasts, isLoading: isPodcastsLoading } = useSearch('top trending hindi english podcasts', shouldLoadMore);

  // Lazy Searches
  const { data: tseriesTracks, isLoading: isTseriesLoading } = useSearch('TSERIES_LATEST', shouldLoadMore);
  const { data: bollywoodTracks, isLoading: isBollyLoading } = useSearch('bollywood pop romantic hits', shouldLoadMore);
  const { data: desiTracks, isLoading: isDesiLoading } = useSearch('desi hip hop punjabi swag', shouldLoadMore);
  const { data: sufiTracks, isLoading: isSufiLoading } = useSearch('sufi ghazal peaceful lo-fi', shouldLoadMore);
  const { data: chillTracks, isLoading: isChillLoading } = useSearch('lofi chill relax aesthetic', shouldLoadMore);
  const { data: trendingTracks, isLoading: isTrendingLoading } = useTrending(shouldLoadMore);
  const { data: topArtistsSearch, isLoading: isTopArtistsLoading } = useSearch('top trending hit artists singers', shouldLoadMore);

  const { data: oracleData, isLoading: isOracleLoading } = useBeastOracle();
  const moodSessionCounts = useGamificationStore(s => s.moodSessionCounts);

  const rankedOracleVibes = useMemo(() => {
    if (!oracleData?.oracle) return [];
    return rankOracleVibes(oracleData.oracle, {
      weatherTemp: weather.temp,
      isSunny: weather.isSunny,
      isRaining: weather.isRaining,
      hourOfDay: new Date().getHours(),
      moodSessionCounts
    });
  }, [oracleData, weather.temp, weather.isSunny, weather.isRaining, moodSessionCounts]);

  // Extract recommended artists
  const recommendedArtists = useMemo(() => {
    const seen = new Set<string>();
    const artists: Artist[] = [];
    
    // Add explicit artists from search API (these usually have real artist thumbnails)
    const addArtists = (list?: Artist[]) => {
      list?.forEach(a => {
        if (a.id && !seen.has(a.id)) {
          seen.add(a.id);
          artists.push(a);
        }
      });
    };
    
    addArtists(forYouTracks?.artists);
    addArtists(moodTracks?.artists);
    addArtists(nowVibeTracks?.artists);
    addArtists(artistTracks?.artists);
    
    // Extract artists from tracks (since Search API often only returns 1-2 artists)
    // We intentionally do NOT use the track's albumArt as the thumbnail anymore, 
    // because it looks like a song image squished into a circle.
    const extractFromTracks = (data?: Track[] | { songs: Track[] }) => {
      const list = Array.isArray(data) ? data : (data?.songs || []);
      list.forEach(t => {
        if (t.artistId && t.artist && t.artist !== 'Unknown' && !seen.has(t.artistId)) {
          seen.add(t.artistId);
          artists.push({
            id: t.artistId,
            name: t.artist,
            thumbnail: undefined // Force undefined so it renders the beautiful gradient initial
          });
        }
      });
    };

    extractFromTracks(trendingTracks);
    extractFromTracks(forYouTracks);
    extractFromTracks(moodTracks);
    extractFromTracks(bollywoodTracks);
    extractFromTracks(nowVibeTracks);
    
    return artists.slice(0, 15);
  }, [forYouTracks, moodTracks, nowVibeTracks, artistTracks, trendingTracks, bollywoodTracks]);

  // Deduplicate tracks
  const deduplicatedLanes = useMemo(() => {
    const seen = new Set<string>();
    quickPicks.forEach(t => seen.add(t.videoId));

    const dedupe = (data?: Track[] | { songs: Track[] }) => {
      if (!data) return undefined;
      const tracks = Array.isArray(data) ? data : (data.songs || []);
      if (!tracks || tracks.length === 0) return undefined;
      
      const unique = tracks.filter(t => !seen.has(t.videoId));
      unique.forEach(t => seen.add(t.videoId));
      return unique;
    };

    return {
      nowVibe: dedupe(nowVibeTracks),
      forYou: dedupe(forYouTracks),
      oracle: dedupe(moodTracks),
      artist: dedupe(artistTracks),
      podcasts: dedupe(podcasts),
      tseries: dedupe(tseriesTracks),
      bollywood: dedupe(bollywoodTracks),
      desi: dedupe(desiTracks),
      sufi: dedupe(sufiTracks),
      chill: dedupe(chillTracks),
      trending: dedupe(trendingTracks),
    };
  }, [
    quickPicks, nowVibeTracks, forYouTracks, moodTracks, artistTracks,
    podcasts, tseriesTracks, bollywoodTracks, desiTracks, sufiTracks, chillTracks, trendingTracks
  ]);

  const handleMoodClick = (mood: typeof MOODS[0]) => {
    setSelectedMood(mood);
    setCustomQuery(mood.query);
    setHasManuallyChangedMood(true);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    setChatInitialMessage(userInput);
    setIsChatOpen(true);
    setUserInput('');
  };

  const handlePlayTrack = (track: Track, list: Track[] = []) => {
    playTrack(track, list.length > 0 ? list : [track]);
    recordListenSession(0, selectedMood.id, list.length);
  };

  return (
    <div className="w-full min-h-full pb-32 flex flex-col bg-[hsl(var(--surface-base))] overflow-x-hidden pt-safe relative">
      <Helmet>
        <title>Pandoos | Where Pandas Vibe</title>
      </Helmet>

      {/* Alive Aurora Background — RESTORED for emotional connection */}
      <div className="absolute top-0 left-0 w-full h-[600px] mood-bg -z-10 pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="w-full px-4 md:px-8 pt-6 pb-2 z-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
              {greeting}
            </h1>
            <p className="text-xs text-white/70 font-medium mt-1 drop-shadow-sm flex items-center gap-2">
              {weather.temp !== null && !weather.isLoading && (
                <span>{weather.isSunny ? '☀️' : weather.isRaining ? '🌧️' : '☁️'} {Math.round(weather.temp)}°C</span>
              )}
              {isPersonalized && "✨ Personalized for you"}
            </p>
          </div>
        </div>
      </header>

      {/* ── HERO (Emotional Centerpiece) ── */}
      <section className="relative w-full px-4 md:px-8 mt-2 mb-8 flex flex-col items-center z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(true)}
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-full glass-mood border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)] mb-6 cursor-pointer group"
        >
          <PandaMascot size={110} emotion={selectedMood.id} />
          {/* Subtle tooltip */}
          <div className="absolute -top-3 -right-2 bg-brand-primary text-white text-xs font-bold px-3 py-1.5 rounded-2xl rounded-bl-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-glow-sm pointer-events-none transform -rotate-6">
            Talk to me! 💬
          </div>
        </motion.div>

        <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white mb-6 text-center drop-shadow-lg">
          Where are we traveling today?
        </h2>
        
        {/* Compact Search Bar */}
        <form onSubmit={handleChatSubmit} className="relative w-full max-w-lg mb-6">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Search or ask the Panda..."
            className="w-full bg-black/40 text-white placeholder-white/40 px-5 py-3.5 rounded-full border border-white/10 focus:outline-none focus:border-brand-primary focus:bg-black/60 text-sm backdrop-blur-xl transition-all shadow-inner"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-glow-sm">
            <Sparkles size={14} />
          </button>
        </form>

        {/* Dense Mood Chips */}
        <div className="w-full max-w-3xl">
          <div className="flex overflow-x-auto gap-2 pb-2 scroll-container snap-x -mx-4 px-4 md:mx-0 md:px-0">
            {MOODS.map(mood => (
              <button
                key={mood.id}
                onClick={() => handleMoodClick(mood)}
                className={`shrink-0 snap-start px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  selectedMood.id === mood.id
                    ? 'bg-white text-black border-white shadow-glow-sm scale-105'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {mood.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── DENSE CONTENT SECTIONS ── */}
      <div className="w-full flex flex-col gap-8 md:gap-10 mt-2 z-10">

        {/* ORACLE — mood-based (MOVED TO TOP PER USER REQUEST) */}
        <ContentRow
          title={selectedMood.label.split(' ')[0] + " Mix"}
          subtitle="Portals aligned to your current vibe."
          gradient="from-indigo-600 to-purple-700"
          emotion={selectedMood.id}
          icon={Sparkles}
          tracks={deduplicatedLanes.oracle}
          isLoading={isMoodLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId={selectedMood.id}
        />

        {/* MEMORY LANE — history */}
        <ContentRow
          title="Jump Back In"
          gradient="from-slate-600 to-slate-800"
          emotion="neutral"
          icon={Clock}
          tracks={quickPicks}
          isLoading={false}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />

        {/* NOW VIBE */}
        {currentTrack && deduplicatedLanes.nowVibe && deduplicatedLanes.nowVibe.length > 0 && (
          <ContentRow
            title="Because You're Listening"
            subtitle={`More like "${currentTrack.title.slice(0, 30)}…"`}
            gradient="from-violet-600 to-fuchsia-700"
            emotion="energy"
            icon={Radio}
            tracks={deduplicatedLanes.nowVibe}
            isLoading={isNowVibeLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
            highlight
          />
        )}

        {/* FOR YOU */}
        {isPersonalized && (
          <ContentRow
            title="Made For You"
            subtitle={`Based on your love for ${topGenres.slice(0, 2).map(g => GENRE_LABELS[g] ?? g).join(' & ')}`}
            gradient="from-brand-primary to-brand-secondary"
            emotion={selectedMood.id}
            icon={Heart}
            tracks={deduplicatedLanes.forYou}
            isLoading={isForYouLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
          />
        )}

        {/* TOP ARTISTS CAROUSEL */}
        {recommendedArtists.length > 0 && (
          <ArtistCarousel artists={recommendedArtists} />
        )}

        {/* BECAUSE YOU LISTENED TO X */}
        {artistDisplayName && deduplicatedLanes.artist && deduplicatedLanes.artist.length > 0 && (
          <ContentRow
            title={`Echoes of ${artistDisplayName}`}
            subtitle="The timeline shifts based on your last adventure."
            gradient="from-cyan-600 to-blue-700"
            emotion="focus"
            icon={Compass}
            tracks={deduplicatedLanes.artist}
            isLoading={isArtistLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
          />
        )}

        {/* BEAST ORACLE SECTIONS */}
        {rankedOracleVibes.map((vibe, idx) => (
          <ContentRow
            key={`oracle-${vibe.id}`}
            title={vibe.title}
            subtitle={idx === 0 ? "🔮 Top AI Match curated for this exact moment." : undefined}
            gradient={idx === 0 ? "from-emerald-600 to-teal-800" : idx === 1 ? "from-rose-600 to-orange-700" : "from-blue-600 to-indigo-800"}
            emotion="energy"
            icon={Brain}
            tracks={vibe.songs.filter(s => !deduplicatedLanes.oracle?.some(t => t.videoId === s.videoId))}
            isLoading={isOracleLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
          />
        ))}

        {/* --- INVISIBLE SPACER FOR LAZY LOADING --- */}
        <div ref={loadMoreRef} className="w-full h-[1px]" />

        {/* T-SERIES LATEST */}
        <ContentRow
          title="T-Series Exclusives"
          gradient="from-red-600 to-red-900"
          emotion="energy"
          icon={Flame}
          tracks={deduplicatedLanes.tseries}
          isLoading={isTseriesLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />

        {/* PODCASTS */}
        <ContentRow
          title="Trending Podcasts"
          gradient="from-slate-700 to-slate-900"
          emotion="focus"
          icon={Mic2}
          tracks={deduplicatedLanes.podcasts}
          isLoading={isPodcastsLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />

        {/* BOLLYWOOD */}
        <ContentRow
          title="The Bollywood Gala"
          gradient="from-pink-600 to-amber-600"
          emotion="bollywood"
          icon={Sparkles}
          tracks={deduplicatedLanes.bollywood}
          isLoading={isBollyLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="bollywood"
        />

        {/* GLOBAL TRENDING */}
        <ContentRow
          title="Global Top Hits"
          gradient="from-blue-600 to-sky-800"
          emotion="focus"
          icon={TrendingUp}
          tracks={deduplicatedLanes.trending}
          isLoading={isTrendingLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />
        
        {/* DESI */}
        <ContentRow
          title="The Desi Gully"
          gradient="from-yellow-500 to-red-600"
          emotion="desi"
          icon={Zap}
          tracks={deduplicatedLanes.desi}
          isLoading={isDesiLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="desi"
        />

      </div>

      <PandaChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialMessage={chatInitialMessage}
      />
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function ContentRow({ title, subtitle, gradient, emotion, icon: Icon, tracks, isLoading, onPlay, lovedIds = [], highlight, expandMoodId }: any) {
  if (!isLoading && (!tracks || tracks.length === 0)) return null;

  const PAGE_SIZE = 12;
  const [page, setPage] = React.useState(1);
  const visible = (tracks || []).slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < (tracks || []).length;

  React.useEffect(() => { setPage(1); }, [expandMoodId, tracks]);

  return (
    <section className="relative w-full flex flex-col py-4 overflow-hidden">
      {/* Emotional Gradient Flare */}
      {gradient && (
        <div className={`absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l ${gradient} opacity-10 blur-[80px] -z-10 pointer-events-none`} />
      )}

      <div className="px-4 md:px-8 mb-4 flex items-center justify-between">
        <div className="flex flex-col max-w-[75%]">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-white/80" size={18} />}
            <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-xs md:text-sm text-white/50 font-medium mt-1 leading-snug">{subtitle}</p>}
        </div>
        
        {emotion && (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full glass border border-white/5 flex items-center justify-center shadow-lg shrink-0">
            <PandaMascot size={28} emotion={emotion} />
          </div>
        )}
      </div>

      <div className="w-full">
        <div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 snap-x snap-mandatory scroll-container px-4 md:px-8">
          {isLoading
            ? [...Array(6)].map((_, i) => (
              <div key={i} className="shrink-0 snap-start w-[140px] md:w-[160px]">
                <div className="w-full aspect-square rounded-xl bg-white/5 animate-pulse mb-3" />
                <div className="w-3/4 h-3 rounded bg-white/5 animate-pulse mb-2" />
                <div className="w-1/2 h-3 rounded bg-white/5 animate-pulse" />
              </div>
            ))
            : (
              <AnimatePresence mode="popLayout">
                {visible.map((track: Track, i: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04 }}
                    className="shrink-0 snap-start group cursor-pointer w-[140px] md:w-[160px]"
                    onClick={() => onPlay(track, tracks)}
                  >
                    <div className="relative w-full rounded-xl overflow-hidden mb-2.5 shadow-md border border-white/5 aspect-square bg-[#0a0a0f]">
                      <TrackImage
                        videoId={track.videoId}
                        title={track.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                          <Play fill="black" size={20} className="ml-1 text-black" />
                        </div>
                      </div>
                      {lovedIds.includes(track.videoId) && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center">
                          <Heart size={12} fill="white" className="text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className={`text-sm font-bold leading-tight line-clamp-1 ${highlight ? 'text-brand-primary' : 'text-white'}`}>
                      {track.title}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-1 mt-0.5">
                      {track.artist}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

          {!isLoading && hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="shrink-0 snap-start flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-all w-[140px] md:w-[160px] aspect-square"
              onClick={() => setPage(p => p + 1)}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">+</span>
              </div>
              <span className="text-sm text-white/50 font-semibold">More</span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function ArtistCarousel({ artists }: { artists: Artist[] }) {
  const openArtist = useUIStore((s) => s.openArtist);

  if (!artists || artists.length === 0) return null;

  return (
    <section className="w-full flex flex-col my-4">
      <div className="px-4 md:px-8 mb-4 flex items-center gap-2">
        <Users size={20} className="text-white/80" />
        <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">Top Artists</h2>
      </div>

      <div className="w-full">
        <div className="flex overflow-x-auto gap-5 md:gap-6 pb-4 snap-x snap-mandatory scroll-container px-4 md:px-8">
          {artists.map((artist, i) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 snap-start flex flex-col items-center cursor-pointer group w-28 md:w-32"
              onClick={() => openArtist(artist.id)}
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-brand-primary transition-colors shadow-lg relative bg-[#0a0a0f]">
                {artist.thumbnail ? (
                  <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-primary to-brand-accent text-white font-display font-bold text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm md:text-base font-bold text-white line-clamp-1 text-center group-hover:text-brand-primary transition-colors">{artist.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
