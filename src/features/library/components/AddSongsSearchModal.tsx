import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Check } from 'lucide-react';
import { useAddTrackToPlaylist, usePlaylistTracks } from '@/features/library/hooks/useLibrary';
import { useSearch, useTrending } from '@/features/search/hooks/useSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track } from '@/types/track';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
}

export function AddSongsSearchModal({ isOpen, onClose, playlistId }: Props) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const { data: searchResults, isLoading: isSearching } = useSearch(debouncedQuery, isOpen && debouncedQuery.length > 0);
  const { data: trendingTracks, isLoading: isTrendingLoading } = useTrending(isOpen && !debouncedQuery);
  const { data: playlistTracks } = usePlaylistTracks(playlistId);
  const addTrackToPlaylist = useAddTrackToPlaylist();

  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setRecentlyAdded(new Set());
    }
  }, [isOpen]);

  const handleAdd = (track: Track) => {
    addTrackToPlaylist.mutate({ playlistId, track, position: Date.now() }, {
      onSuccess: () => {
        setRecentlyAdded(prev => new Set(prev).add(track.videoId));
      }
    });
  };

  const isTrackInPlaylist = (videoId: string) => {
    if (recentlyAdded.has(videoId)) return true;
    return playlistTracks?.some(t => t.videoId === videoId) || false;
  };

  const displayTracks = debouncedQuery.length > 0 ? searchResults?.songs : trendingTracks;
  const isLoading = debouncedQuery.length > 0 ? isSearching : isTrendingLoading;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end md:justify-center p-0 md:p-4 isolate pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9999] pointer-events-auto"
        />
        
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className="relative w-full max-w-lg h-[80vh] md:h-[600px] flex flex-col bg-surface-elevated rounded-t-3xl md:rounded-3xl border border-white/10 shadow-2xl z-[10000] pointer-events-auto overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-surface-elevated shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
              <input 
                autoFocus
                type="text"
                placeholder="Search for songs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:bg-white/10 transition-colors"
              />
            </div>
            <button onClick={onClose} className="p-3 text-white/70 hover:text-white bg-white/5 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto scroll-container p-2">
            {!debouncedQuery && (
              <h3 className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/50">
                Recommended
              </h3>
            )}
            
            {isLoading ? (
              <div className="flex flex-col gap-2 p-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-14 rounded-xl skeleton" />
                ))}
              </div>
            ) : displayTracks && displayTracks.length > 0 ? (
              <div className="flex flex-col gap-1">
                {displayTracks.map((track) => {
                  const added = isTrackInPlaylist(track.videoId);
                  return (
                    <div 
                      key={track.videoId}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                        <p className="text-xs text-white/50 truncate">{track.artist}</p>
                      </div>
                      <button 
                        onClick={() => !added && handleAdd(track)}
                        disabled={added || addTrackToPlaylist.isPending}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-all ${
                          added 
                            ? 'bg-brand-primary/20 text-brand-primary' 
                            : 'bg-white/5 text-white/70 hover:bg-white/20 hover:text-white active:scale-95'
                        }`}
                      >
                        {added ? <Check size={20} /> : <Plus size={20} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-white/50">
                <p>No songs found for "{query}"</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
