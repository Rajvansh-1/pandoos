import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, TrendingUp, Music, Clock, Zap, Brain, Dumbbell, Moon, Compass, Heart, Radio, Flame } from 'lucide-react';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useSearch, useTrending } from '@/features/search/hooks/useSearch';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { getBestThumbnail, searchTracks } from '@/services/youtube';
import { MOOD_SEEDS } from '@/data/moodSeeds';
import { buildSearchQuery } from '@/services/recommendEngine';
import { getPersonalizedTracklist, getExpandedTracklist } from '@/services/trackExpansion';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track } from '@/types/track';
import { useInView } from '@/hooks/useInView';

// Stable session seed so shuffles are consistent until page refresh
const SESSION_SEED = Date.now();

const MOODS = [
  { id: 'bollywood',   label: 'Bollywood 💫', query: 'bollywood pop romantic hits' },
  { id: 'desi',        label: 'Desi Swag 🔥', query: 'desi hip hop punjabi swag' },
  { id: 'sufi',        label: 'Sufi Soul 🕊️', query: 'sufi ghazal peaceful lo-fi' },
  { id: 'devotional',  label: 'Devotional 🛕', query: 'bhakti bhajan devotional peaceful' },
  { id: 'chill',       label: 'Chill 🍃',      query: 'lofi chill relax aesthetic' },
  { id: 'energy',      label: 'Energy ⚡',     query: 'high energy upbeat edm hits' },
  { id: 'focus',       label: 'Focus 🧠',      query: 'deep focus ambient electronic' },
  { id: 'workout',     label: 'Workout 🏋️',   query: 'heavy workout gym phonk' },
  { id: 'latenight',   label: 'Night 🌃',      query: 'late night drive synthwave retro' },
  { id: 'happy',       label: 'Happy ☀️',      query: 'happy feel good uplifting pop' },
  { id: 'romantic',    label: 'Romantic 💖',   query: 'romantic love songs acoustic' },
  { id: 'heartbroken', label: 'Sad 🌧️',        query: 'sad emotional acoustic' },
  { id: 'sleepy',      label: 'Sleepy 💤',     query: 'sleep ambient delta waves' },
];

const GENRE_LABELS: Record<string, string> = {
  bollywood: 'Bollywood 💫', desi: 'Desi 🔥', punjabi: 'Punjabi 🎵',
  sufi: 'Sufi 🕊️', devotional: 'Devotional 🛕', lofi: 'Lo-Fi 🍃', electronic: 'Electronic ⚡',
  rock: 'Rock 🎸', acoustic: 'Acoustic 🎻', pop: 'Pop ✨',
};

import { PandaChatModal } from '@/features/panda/components/PandaChatModal';
import { useWeatherContext } from '@/hooks/useWeatherContext';

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
  const topArtists = useTasteStore(s => s.topArtists);
  const recentArtists = useTasteStore(s => s.recentArtists);
  const lovedIds = useTasteStore(s => s.lovedIds);

  const isPersonalized = topGenres.length > 0 || recentArtists.length > 0;

  // Quick picks from history or taste-expanded seeds
  const quickPicks = useMemo(() => {
    if (history.length >= 4) return history.slice(0, 12);
    return getExpandedTracklist('bollywood', SESSION_SEED).slice(0, 12);
  }, [history]);

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

  // "Because you listened to X" — top recent artist
  const recentArtist = recentArtists[0] ?? (history[0]?.artist ?? null);
  const artistDisplayName = recentArtist
    ? recentArtist.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;

  // "Now Vibe" — derived from current track if playing
  const nowVibeQuery = useMemo(() => {
    if (!currentTrack) return null;
    return buildSearchQuery(currentTrack);
  }, [currentTrack?.videoId]);

  // Searches
  const { ref: loadMoreRef, isInView: shouldLoadMore } = useInView({ rootMargin: '600px' });

  // Immediate Searches (Top sections)
  const { data: nowVibeTracks,  isLoading: isNowVibeLoading }  = useSearch(nowVibeQuery ?? '');
  const { data: forYouTracks,   isLoading: isForYouLoading }   = useSearch(isPersonalized ? forYouQuery : '');
  const { data: moodTracks,     isLoading: isMoodLoading }     = useSearch(customQuery);
  const { data: artistTracks,   isLoading: isArtistLoading }   = useSearch(recentArtist ? `${recentArtist} top songs` : '');

  // Lazy Searches (Bottom sections) - Only enabled when scrolling down
  const { data: tseriesTracks,  isLoading: isTseriesLoading }  = useSearch('TSERIES_LATEST', shouldLoadMore);
  const { data: bollywoodTracks,isLoading: isBollyLoading }    = useSearch('bollywood pop romantic hits', shouldLoadMore);
  const { data: desiTracks,     isLoading: isDesiLoading }     = useSearch('desi hip hop punjabi swag', shouldLoadMore);
  const { data: sufiTracks,     isLoading: isSufiLoading }     = useSearch('sufi ghazal peaceful lo-fi', shouldLoadMore);
  const { data: devotionalTracks, isLoading: isDevotionalLoading } = useSearch('bhakti bhajan devotional peaceful', shouldLoadMore);
  const { data: chillTracks,    isLoading: isChillLoading }    = useSearch('lofi chill relax aesthetic', shouldLoadMore);
  const { data: workoutTracks,  isLoading: isWorkoutLoading }  = useSearch('heavy workout gym phonk', shouldLoadMore);
  const { data: lateNightTracks,isLoading: isLateLoading }     = useSearch('late night drive synthwave retro', shouldLoadMore);
  const { data: trendingTracks, isLoading: isTrendingLoading } = useTrending(shouldLoadMore);

  // Deduplicate tracks across lanes top-to-bottom to ensure zero repetitions
  const deduplicatedLanes = useMemo(() => {
    const seen = new Set<string>();

    // We also don't want to repeat tracks that are already in quickPicks
    quickPicks.forEach(t => seen.add(t.videoId));

    const dedupe = (tracks?: Track[]) => {
      if (!tracks) return undefined;
      const unique = tracks.filter(t => !seen.has(t.videoId));
      unique.forEach(t => seen.add(t.videoId));
      return unique;
    };

    return {
      nowVibe: dedupe(nowVibeTracks),
      forYou: dedupe(forYouTracks),
      oracle: dedupe(moodTracks),
      artist: dedupe(artistTracks),
      tseries: dedupe(tseriesTracks),
      bollywood: dedupe(bollywoodTracks),
      desi: dedupe(desiTracks),
      sufi: dedupe(sufiTracks),
      devotional: dedupe(devotionalTracks),
      chill: dedupe(chillTracks),
      lateNight: dedupe(lateNightTracks),
      workout: dedupe(workoutTracks),
      trending: dedupe(trendingTracks),
    };
  }, [
    quickPicks, nowVibeTracks, forYouTracks, moodTracks, artistTracks, tseriesTracks,
    bollywoodTracks, desiTracks, sufiTracks, devotionalTracks, chillTracks, lateNightTracks,
    workoutTracks, trendingTracks
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
    <div className="w-full min-h-full pb-32 flex flex-col items-center overflow-x-hidden">
      <Helmet>
        <title>Pandoos | Where Pandas Vibe</title>
        <meta name="description" content="Discover new music, curated for your mood and taste. Explore Bollywood, Desi, Lofi, and more." />
      </Helmet>

      {/* ── HEADER ── */}
      <header className="w-full max-w-7xl px-4 md:px-8 pt-10 flex items-center justify-between mb-6 z-20">
        <div>
          <h1 className="text-2xl md:text-4xl font-display font-extrabold text-white tracking-tight drop-shadow-lg flex items-center flex-wrap gap-2">
            {greeting}{user ? <span className="text-brand-primary">, {user.username}</span> : ''}
            <span className="inline-block animate-[wave_2s_ease-in-out_infinite] origin-bottom-right">👋</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {isPersonalized && (
              <p className="text-white/50 text-sm flex items-center gap-1">
                <Sparkles size={12} className="text-brand-primary" />
                Personalized for your taste
              </p>
            )}
            {!weather.isLoading && weather.temp !== null && (
              <span className="text-xs font-bold bg-white/5 text-white/70 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md flex items-center gap-1">
                {weather.isSunny ? '☀️' : weather.isRaining ? '🌧️' : '☁️'} {Math.round(weather.temp)}°C
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative w-full max-w-7xl px-4 md:px-8 mb-14 flex flex-col items-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] max-w-3xl h-64 bg-brand-primary/20 blur-[80px] -z-10 rounded-[100%] pointer-events-none" style={{ willChange: 'transform' }} />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(true)}
          className="relative z-10 w-36 h-36 md:w-44 md:h-44 rounded-full glass-mood border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-6 cursor-pointer group"
        >
          <PandaMascot size={140} emotion={selectedMood.id} />
          
          {/* Subtle "Talk to me" tooltip */}
          <div className="absolute -top-3 -right-2 bg-brand-primary text-white text-xs font-bold px-3 py-1.5 rounded-2xl rounded-bl-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-glow-sm pointer-events-none transform -rotate-6">
            Talk to me! 💬
          </div>
        </motion.div>

        <h2 className="text-3xl md:text-5xl font-display font-extrabold text-white mb-4 text-center tracking-tight drop-shadow-lg">
          Where are we traveling today?
        </h2>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-5 max-w-2xl">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => handleMoodClick(mood)}
<<<<<<< Updated upstream
              className={`px-5 py-2 rounded-full text-sm md:text-base font-bold transition-all duration-300 backdrop-blur-md border ${
                selectedMood.id === mood.id
                  ? 'bg-white text-black shadow-glow-md border-white scale-105'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:scale-105'
              }`}
=======
              className={`px-5 py-2 rounded-full text-sm md:text-base font-bold transition-all duration-300 backdrop-blur-md border ${selectedMood.id === mood.id
                ? 'bg-white text-black shadow-glow-md border-white scale-105'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:scale-105'
                }`}
>>>>>>> Stashed changes
            >
              {mood.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleChatSubmit} className="relative w-full max-w-lg">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Or tell me how you feel..."
            className="w-full bg-black/40 text-white placeholder-white/40 px-6 py-4 rounded-full border border-white/10 focus:outline-none focus:border-brand-primary focus:bg-black/60 text-base backdrop-blur-xl transition-all shadow-inner"
          />
          <button
            type="submit"
            aria-label="Search with AI"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center transition-transform shadow-glow-sm hover:scale-110 active:scale-95"
          >
            <Sparkles size={16} fill="currentColor" />
          </button>
        </form>
      </section>

      {/* ── SECTIONS ── */}
      <div className="w-full max-w-7xl px-4 md:px-8 flex flex-col gap-10 md:gap-16">

        {/* NOW VIBE — if a track is playing */}
        {currentTrack && nowVibeTracks && nowVibeTracks.length > 0 && (
          <RealmSection
            title="Because You're Listening"
            description={`More like "${currentTrack.title.slice(0, 40)}…"`}
            gradient="from-violet-600 to-fuchsia-700"
            emotion="energy"
            icon={Radio}
            tracks={deduplicatedLanes.nowVibe}
            isLoading={isNowVibeLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
            badge="🎯 Live Recommendation"
            highlight
          />
        )}

        {/* FOR YOU — personalized */}
        {isPersonalized && (
          <RealmSection
            title="Made For You"
            description={`Based on your love for ${topGenres.slice(0, 2).map(g => GENRE_LABELS[g] ?? g).join(' & ')}`}
            gradient="from-brand-primary to-brand-secondary"
            emotion={selectedMood.id}
            icon={Heart}
            tracks={deduplicatedLanes.forYou}
            isLoading={isForYouLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
            badge="✨ Personalized"
            highlight
          />
        )}

        {/* ORACLE — mood-based */}
        <RealmSection
          title="The Oracle's Vision"
          description={`Portals aligned to: ${selectedMood.label}`}
          gradient="from-indigo-600 to-purple-700"
          emotion={selectedMood.id}
          icon={Sparkles}
          tracks={deduplicatedLanes.oracle}
          isLoading={isMoodLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          highlight={!isPersonalized}
          expandMoodId={selectedMood.id}
        />

        {/* MEMORY LANE — history */}
        <RealmSection
          title="Memory Lane"
          description="Familiar vibes you recently traveled through."
          gradient="from-slate-600 to-slate-800"
          emotion="neutral"
          icon={Clock}
          tracks={quickPicks}
          isLoading={false}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />

        {/* BECAUSE YOU LISTENED TO X */}
        {artistDisplayName && artistTracks && artistTracks.length > 0 && (
          <RealmSection
            title={`Echoes of ${artistDisplayName}`}
            description="The timeline shifts based on your last adventure."
            gradient="from-cyan-600 to-blue-700"
            emotion="focus"
            icon={Compass}
            tracks={deduplicatedLanes.artist}
            isLoading={isArtistLoading}
            onPlay={handlePlayTrack}
            lovedIds={lovedIds}
            badge={`🎵 Because you played ${artistDisplayName}`}
          />
        )}

        {/* --- INVISIBLE SPACER FOR LAZY LOADING BOTTOM SECTIONS --- */}
        <div ref={loadMoreRef} className="w-full h-1" />

        {/* T-SERIES LATEST */}
        <RealmSection
          title="T-Series Exclusive"
          description="The latest blockbusters and chart-toppers."
          gradient="from-red-600 to-red-900"
          emotion="energy"
          icon={Flame}
          tracks={deduplicatedLanes.tseries}
          isLoading={isTseriesLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          badge="🔥 Top Hits"
        />

        {/* BOLLYWOOD GALA */}
        <RealmSection
          title="The Bollywood Gala"
          description="Starry-eyed romance and vibrant pop hits."
          gradient="from-pink-600 to-amber-600"
          emotion="bollywood"
          icon={Sparkles}
          tracks={deduplicatedLanes.bollywood}
          isLoading={isBollyLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="bollywood"
        />

        {/* DESI GULLY */}
        <RealmSection
          title="The Desi Gully"
          description="High-energy Punjabi beats and pure street swag."
          gradient="from-yellow-500 to-red-600"
          emotion="desi"
          icon={Zap}
          tracks={deduplicatedLanes.desi}
          isLoading={isDesiLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="desi"
        />

        {/* SUFI DARBAR */}
        <RealmSection
          title="The Sufi Darbar"
          description="Deep, soulful ghazals to bring you peace."
          gradient="from-indigo-800 to-purple-900"
          emotion="sufi"
          icon={Moon}
          tracks={deduplicatedLanes.sufi}
          isLoading={isSufiLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="sufi"
        />

        {/* DEVOTIONAL DARSHAN */}
        <RealmSection
          title="Devotional Darshan"
          description="Aartis, bhajans, and spiritual connection."
          gradient="from-orange-600 to-amber-700"
          emotion="devotional"
          icon={Sparkles}
          tracks={deduplicatedLanes.devotional}
          isLoading={isDevotionalLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="devotional"
        />

        {/* CHILL BAMBOO */}
        <RealmSection
          title="The Chill Bamboo Forest"
          description="Rest your soul. Deep greens, lo-fi beats, pure tranquility."
          gradient="from-emerald-700 to-teal-900"
          emotion="chill"
          icon={Music}
          tracks={deduplicatedLanes.chill}
          isLoading={isChillLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="chill"
        />

        {/* NEON CITY NIGHTS */}
        <RealmSection
          title="Neon City Nights"
          description="Cruise down the retro highway under purple skies."
          gradient="from-fuchsia-700 to-purple-900"
          emotion="latenight"
          icon={Moon}
          tracks={deduplicatedLanes.lateNight}
          isLoading={isLateLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="latenight"
        />

        {/* IRON DOJO */}
        <RealmSection
          title="The Iron Dojo"
          description="Beast mode activated. Heavy phonk and relentless energy."
          gradient="from-red-700 to-orange-800"
          emotion="workout"
          icon={Dumbbell}
          tracks={deduplicatedLanes.workout}
          isLoading={isWorkoutLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
          expandMoodId="workout"
        />

        {/* GLOBAL TRENDING */}
        <RealmSection
          title="The Global Archive"
          description="What the world is traveling to right now."
          gradient="from-blue-600 to-sky-800"
          emotion="focus"
          icon={TrendingUp}
          tracks={deduplicatedLanes.trending}
          isLoading={isTrendingLoading}
          onPlay={handlePlayTrack}
          lovedIds={lovedIds}
        />

      </div>

      {/* ── FOOTER SLOGAN ── */}
      <footer className="w-full max-w-7xl px-4 md:px-8 mt-8 mb-12 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-lg backdrop-blur-md">
            <PandaMascot size={32} emotion="chill" />
          </div>
          <p className="text-lg md:text-xl font-medium italic text-white/70 drop-shadow-md px-4 tracking-wide">
            "Life is short relax like a Panda and enjoy music"
          </p>
          <div className="w-24 h-[2px] mt-4 bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent rounded-full" />
        </motion.div>
      </footer>

      <PandaChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialMessage={chatInitialMessage} 
      />

    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────────────────────

interface RealmSectionProps {
  title: string;
  description: string;
  gradient: string;
  emotion: string;
  icon: React.ElementType;
  tracks?: Track[];
  isLoading: boolean;
  onPlay: (track: Track, list: Track[]) => void;
  lovedIds?: string[];
  badge?: string;
  highlight?: boolean;
  expandMoodId?: string;
}

function RealmSection({ title, description, gradient, emotion, icon: Icon, tracks, isLoading, onPlay, lovedIds = [], badge, highlight, expandMoodId }: RealmSectionProps) {
  if (!isLoading && (!tracks || tracks.length === 0)) return null;

  return (
    <section className="relative w-full rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 blur-[80px] -z-10`} style={{ transform: 'translateZ(0)' }} />

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 items-center xl:items-start relative z-10">
        {/* Left column */}
        <div className="flex flex-col items-center xl:items-start text-center xl:text-left shrink-0 w-full xl:w-64">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <Icon className="text-white" size={20} />
            </div>
            {badge && (
              <span className="text-xs font-bold bg-white/10 text-white/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                {badge}
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2 drop-shadow-md leading-tight">
            {title}
          </h2>
          <p className="text-white/60 text-sm font-medium mb-6 leading-relaxed max-w-xs">
            {description}
          </p>
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
<<<<<<< Updated upstream
            className="w-28 h-28 md:w-36 md:h-36 rounded-full glass-mood border border-white/10 flex items-center justify-center"
=======
            className="rounded-full glass-mood border border-white/10 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 mt-0"
>>>>>>> Stashed changes
          >
            <PandaMascot size={70} emotion={emotion} />
          </motion.div>
        </div>

        {/* Track list */}
        <div className="flex-1 w-full min-w-0">
          <TrackList tracks={tracks} isLoading={isLoading} onPlay={onPlay} highlight={highlight} lovedIds={lovedIds} expandMoodId={expandMoodId} />
        </div>
      </div>
    </section>
  );
}

function TrackList({ tracks, isLoading, onPlay, highlight, lovedIds = [], expandMoodId }: {
  tracks?: Track[];
  isLoading: boolean;
  onPlay: (t: Track, list: Track[]) => void;
  highlight?: boolean;
  lovedIds?: string[];
  expandMoodId?: string; // if set, enables infinite scroll from expansion engine
}) {
  const PAGE_SIZE = 12;
  const [page, setPage] = React.useState(1);

  // Full track pool: API results merged with expanded seeds (deduped)
  const fullPool = React.useMemo(() => {
    const base = tracks ?? [];
    if (!expandMoodId) return base;
    const expanded = getExpandedTracklist(expandMoodId, SESSION_SEED);
    const seen = new Set(base.map(t => t.videoId));
    const extra = expanded.filter(t => !seen.has(t.videoId));
    return [...base, ...extra];
  }, [tracks, expandMoodId]);

  const visible = fullPool.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < fullPool.length;

  // Reset page when tracks change (mood switch)
  React.useEffect(() => { setPage(1); }, [expandMoodId, tracks]);

  return (
    <div className="w-full">
      <div className="flex overflow-x-auto gap-4 md:gap-5 pb-4 snap-x snap-mandatory scroll-container px-1 -mx-1">
        {isLoading
          ? [...Array(6)].map((_, i) => (
<<<<<<< Updated upstream
              <div key={i} className={`shrink-0 snap-start rounded-2xl animate-pulse bg-white/5 border border-white/5 ${highlight ? 'w-[200px] h-[280px]' : 'w-[150px] h-[150px]'}`}>
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={28} className="text-white/10" />
                </div>
=======
            <div key={i} className="shrink-0 snap-start rounded-2xl animate-pulse bg-white/5 border border-white/5 w-[160px] md:w-[180px] aspect-square">
              <div className="w-full h-full flex items-center justify-center">
                <Music size={28} className="text-white/10" />
>>>>>>> Stashed changes
              </div>
            ))
          : (
            <AnimatePresence mode="popLayout">
              {visible.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
<<<<<<< Updated upstream
                  className={`shrink-0 snap-start group cursor-pointer ${highlight ? 'w-[200px] md:w-[220px]' : 'w-[150px] md:w-[170px]'}`}
                  onClick={() => onPlay(track, fullPool)}
                >
                  {/* Thumbnail — uses TrackImage for guaranteed no grey box */}
                  <div className={`relative w-full rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/10 transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${highlight ? 'aspect-[4/5]' : 'aspect-square'}`}>
=======
                  className="shrink-0 snap-start group cursor-pointer w-[160px] md:w-[180px]"
                  onClick={() => onPlay(track, fullPool)}
                >
                  {/* Thumbnail — uses TrackImage for guaranteed no grey box */}
                  <div className="relative w-full rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/10 transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] aspect-square">
>>>>>>> Stashed changes
                    <TrackImage
                      videoId={track.videoId}
                      title={track.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Loved badge */}
                    {lovedIds.includes(track.videoId) && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
                        <Heart size={12} fill="white" className="text-white" />
                      </div>
                    )}

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play fill="black" size={20} className="ml-1 text-black" />
                      </div>
                    </div>
                  </div>

                  {/* Text */}
                  <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1 group-hover:text-brand-primary transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-xs text-white/50 line-clamp-1 font-medium">
                    {track.artist}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

        {/* Inline Load More card */}
        {!isLoading && hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
<<<<<<< Updated upstream
            className={`shrink-0 snap-start flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-all group ${highlight ? 'w-[200px] md:w-[220px] aspect-[4/5]' : 'w-[150px] md:w-[170px] aspect-square'}`}
=======
            className="shrink-0 snap-start flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-all group w-[160px] md:w-[180px] aspect-square"
>>>>>>> Stashed changes
            onClick={() => setPage(p => p + 1)}
          >
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-brand-primary font-bold text-xl">+</span>
            </div>
            <span className="text-xs text-white/50 font-semibold text-center px-2">More songs</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
