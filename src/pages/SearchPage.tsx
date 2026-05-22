import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search as SearchIcon, X, Play, Clock, HardDrive } from 'lucide-react';
import { useSearch } from '@/features/search/hooks/useSearch';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { TrackImage } from '@/components/shared/TrackImage';
import { SEARCH_DEBOUNCE_MS } from '@/utils/constants';
import { Track } from '@/types/track';

const BROWSE_CATEGORIES = [
  { id: 'podcasts', name: 'Podcasts', color: 'bg-[#27856A]', image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=128&h=128&fit=crop' },
  { id: 'madeforyou', name: 'Made For You', color: 'bg-[#1E3264]', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=128&h=128&fit=crop' },
  { id: 'charts', name: 'Charts', color: 'bg-[#8D67AB]', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=128&h=128&fit=crop' },
  { id: 'newreleases', name: 'New Releases', color: 'bg-[#E8115B]', image: 'https://images.unsplash.com/photo-1621360811013-c76831f162cb?w=128&h=128&fit=crop' },
  { id: 'discover', name: 'Discover', color: 'bg-[#8C1932]', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=128&h=128&fit=crop' },
  { id: 'live', name: 'Live Events', color: 'bg-[#7358FF]', image: 'https://images.unsplash.com/photo-1540039155732-d68a264a2741?w=128&h=128&fit=crop' },
  { id: 'pop', name: 'Pop', color: 'bg-[#148A08]', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=128&h=128&fit=crop' },
  { id: 'hiphop', name: 'Hip-Hop', color: 'bg-[#BA5D07]', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=128&h=128&fit=crop' },
  { id: 'workout', name: 'Workout', color: 'bg-[#777777]', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=128&h=128&fit=crop' },
  { id: 'chill', name: 'Chill', color: 'bg-[#D84000]', image: 'https://images.unsplash.com/photo-1499810631641-541e76d678a2?w=128&h=128&fit=crop' },
];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const { data: remoteResults, isLoading } = useSearch(debouncedQuery, true, true);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playHistory = usePlayerStore((state) => state.history);
  const { recentQueries, recentTracks, addQuery, addTrack, clearHistory } = useSearchStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim().length > 2) {
        addQuery(query);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, addQuery]);

  // Find exact local matches from device history
  const localMatches = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const lowerQ = debouncedQuery.toLowerCase();
    const matches = playHistory.filter(t => t.title.toLowerCase().includes(lowerQ) || t.artist.toLowerCase().includes(lowerQ));
    
    // Deduplicate matches by videoId
    const unique = new Map();
    matches.forEach(m => unique.set(m.videoId, m));
    return Array.from(unique.values()).slice(0, 3);
  }, [debouncedQuery, playHistory]);

  const results = remoteResults || [];
  const topResult = results[0];
  const otherResults = results.slice(1, 5);

  const handlePlay = (track: Track, contextList: Track[]) => {
    playTrack(track, contextList);
    addTrack(track);
  };

  return (
    <div className="w-full min-h-full flex flex-col pb-32">
      <Helmet>
        <title>Search | Pandoos</title>
        <meta name="description" content="Search for your favorite songs, artists, and playlists on Pandoos." />
      </Helmet>

      {/* Sticky Header with Search Bar */}
      <div className="sticky top-0 z-20 pt-6 pb-4 px-4 md:px-8 bg-surface-base/95 backdrop-blur-xl border-b border-white/5">
        <div className="relative w-full max-w-2xl mx-auto md:mx-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-6 w-6 text-white/50" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full h-14 pl-12 pr-12 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-transparent rounded-full text-white placeholder-white/50 font-bold text-base focus:outline-none transition-all shadow-inner"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 pt-6">
        
        {/* IDLE STATE: No Query */}
        {!query && (
          <div className="animate-in fade-in duration-500 flex flex-col gap-10 max-w-7xl mx-auto">
            
            {/* Recent Searches / Plays */}
            {(recentQueries.length > 0 || recentTracks.length > 0) && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-extrabold text-white">Recent searches</h2>
                  <button onClick={clearHistory} className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider">Clear</button>
                </div>
                
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {/* Recent Queries (rendered as circular chips) */}
                  {recentQueries.map((rq, idx) => (
                    <button
                      key={`q-${idx}`}
                      onClick={() => setQuery(rq)}
                      className="shrink-0 snap-start h-12 px-6 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors"
                    >
                      <SearchIcon size={16} className="text-white/50" />
                      <span className="text-sm font-bold text-white">{rq}</span>
                    </button>
                  ))}
                  
                  {/* Recent Tracks (rendered as small square cards) */}
                  {recentTracks.map((track) => (
                    <button
                      key={`t-${track.id}`}
                      onClick={() => playTrack(track, recentTracks)}
                      className="shrink-0 snap-start w-32 flex flex-col gap-3 group relative text-left"
                    >
                      <div className="w-32 h-32 rounded-xl overflow-hidden shadow-lg relative">
                        <TrackImage 
                          videoId={track.videoId} 
                          title={track.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center shadow-xl scale-75 group-hover:scale-100 transition-transform">
                            <Play size={16} fill="white" className="text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{track.title}</p>
                        <p className="text-xs font-medium text-white/50 truncate mt-1">{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Browse All Grid (Spotify Style) */}
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-display font-extrabold text-white">Browse all</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {BROWSE_CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setQuery(category.name)}
                    className={`${category.color} aspect-square rounded-xl md:rounded-2xl p-4 relative overflow-hidden text-left hover:scale-[1.02] active:scale-[0.98] transition-transform`}
                  >
                    <span className="text-lg md:text-2xl font-display font-bold text-white break-words drop-shadow-md">
                      {category.name}
                    </span>
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="absolute -right-4 -bottom-4 w-20 h-20 md:w-28 md:h-28 rotate-[25deg] shadow-[-10px_10px_20px_rgba(0,0,0,0.4)] rounded-sm"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && query.length > 2 && (
          <div className="flex flex-col lg:flex-row gap-8 mt-4 animate-pulse max-w-7xl mx-auto">
            <div className="flex-1 max-w-sm">
              <div className="h-8 w-32 bg-white/10 rounded mb-4" />
              <div className="w-full aspect-square bg-white/5 rounded-2xl" />
            </div>
            <div className="flex-[2]">
              <div className="h-8 w-24 bg-white/10 rounded mb-4" />
              <div className="flex flex-col gap-2">
                {[...Array(4)].map((_, i) => <div key={i} className="w-full h-16 bg-white/5 rounded-xl" />)}
              </div>
            </div>
          </div>
        )}

        {/* NO RESULTS */}
        {results.length === 0 && !isLoading && query.length > 2 && (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold text-white mb-2">No results found for "{query}"</h2>
            <p className="text-white/50">Please make sure your words are spelled correctly or use less or different keywords.</p>
          </div>
        )}

        {/* RESULTS STATE */}
        {results.length > 0 && !isLoading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            
            {/* Local Matches Banner */}
            {localMatches.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <HardDrive size={20} className="text-brand-primary" />
                  From your device
                </h2>
                <div className="flex flex-col gap-2">
                  {localMatches.map(track => (
                    <button
                      key={`local-${track.id}`}
                      onClick={() => handlePlay(track, localMatches)}
                      className="flex items-center gap-4 p-2 md:p-3 rounded-xl hover:bg-white/10 transition-colors group text-left"
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden relative shrink-0">
                        <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <Play size={16} fill="white" className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-white truncate">{track.title}</p>
                        <p className="text-sm font-medium text-white/60 truncate flex items-center gap-2">
                          <Clock size={12} /> Played previously
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              {/* TOP RESULT */}
              {topResult && (
                <div className="flex-1 max-w-md">
                  <h2 className="text-2xl font-display font-extrabold text-white mb-4">Top result</h2>
                  <button
                    onClick={() => handlePlay(topResult, results)}
                    className="w-full bg-[#181818] hover:bg-[#282828] p-5 rounded-[24px] flex flex-col gap-5 text-left group transition-all duration-300 relative overflow-hidden border border-white/5 hover:border-white/10"
                  >
                    {/* Animated background glow on hover */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="w-24 h-24 rounded-xl overflow-hidden shadow-2xl relative z-10">
                      <TrackImage 
                        videoId={topResult.videoId} 
                        title={topResult.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className="text-3xl font-display font-black text-white line-clamp-2 mb-2 tracking-tight">
                        {topResult.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Song</span>
                        <span className="text-sm font-bold text-white/60">{topResult.artist}</span>
                      </div>
                    </div>

                    {/* Floating Play Button */}
                    <div className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.5)] translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
                      <Play size={24} fill="white" className="text-white ml-1" />
                    </div>
                  </button>
                </div>
              )}

              {/* SONGS LIST */}
              <div className="flex-[2]">
                <h2 className="text-2xl font-display font-extrabold text-white mb-4">Songs</h2>
                <div className="flex flex-col">
                  {otherResults.map((track, idx) => (
                    <button
                      key={track.id}
                      onClick={() => handlePlay(track, results)}
                      className="flex items-center gap-4 p-2 md:p-3 rounded-xl hover:bg-white/10 transition-colors group text-left relative overflow-hidden"
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden relative shrink-0">
                        <TrackImage 
                          videoId={track.videoId} 
                          title={track.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={16} fill="white" className="text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-base font-bold text-white truncate group-hover:text-brand-primary transition-colors">{track.title}</p>
                        <p className="text-sm font-medium text-white/60 truncate">{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Show more dummy button */}
                {results.length > 5 && (
                  <div className="mt-2 pl-3">
                    <span className="text-sm font-bold text-white/50 hover:text-white cursor-pointer uppercase tracking-wider">Show more</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
