import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Shuffle, Heart, ArrowLeft, MoreHorizontal, Music2, Plus } from 'lucide-react';
import { usePlaylists, usePlaylistTracks, useLikedSongs, useRemoveTrackFromPlaylist } from '@/features/library/hooks/useLibrary';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { PlaylistTrackItem } from '@/features/library/components/PlaylistTrackItem';
import { AddSongsSearchModal } from '@/features/library/components/AddSongsSearchModal';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isLiked = id === 'liked';

  const { data: playlists } = usePlaylists();
  const playlist = useMemo(() => playlists?.find(p => p.id === id), [playlists, id]);

  const { data: playlistTracks, isLoading: loadingPlaylistTracks } = usePlaylistTracks(id || '');
  const { data: likedSongs, isLoading: loadingLikedSongs } = useLikedSongs();

  const tracks = isLiked ? likedSongs : playlistTracks;
  const isLoading = isLiked ? loadingLikedSongs : loadingPlaylistTracks;

  const playTrack = usePlayerStore((state) => state.playTrack);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const isShuffling = usePlayerStore((state) => state.isShuffling);
  
  const removeTrack = useRemoveTrackFromPlaylist();
  const [isAddSongsModalOpen, setIsAddSongsModalOpen] = React.useState(false);

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    playTrack(tracks[0], tracks);
  };

  const handleShufflePlay = () => {
    if (!tracks || tracks.length === 0) return;
    if (!isShuffling) {
      toggleShuffle();
    }
    // Pick a random track to start with if we want true shuffle play,
    // or just play first and let player shuffle the rest.
    const randomIndex = Math.floor(Math.random() * tracks.length);
    playTrack(tracks[randomIndex], tracks);
  };

  // Determine metadata
  const title = isLiked ? 'Liked Songs' : playlist?.name || 'Playlist';
  const coverUrl = isLiked ? null : playlist?.coverUrl;
  const trackCount = tracks?.length || 0;

  return (
    <div className="w-full h-full overflow-y-auto scroll-container relative pb-nav bg-surface-base">
      <Helmet>
        <title>{title} | Pandoos</title>
      </Helmet>

      {/* Hero Section */}
      <div className="relative pt-safe">
        {/* Dynamic Background Gradient (simplified static for now, can be extracted from cover) */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/40 via-surface-base to-surface-base pointer-events-none z-0 h-96" />
        
        <div className="relative z-10 px-4 md:px-8 pt-4 pb-8 flex flex-col md:flex-row items-end gap-6 md:gap-8 mt-8">
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>

          {/* Cover Art */}
          <div className="w-48 h-48 md:w-60 md:h-60 rounded-2xl shadow-2xl bg-surface-elevated overflow-hidden shrink-0 mx-auto md:mx-0 flex items-center justify-center border border-white/10 mt-12 md:mt-0">
            {isLiked ? (
              <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
                <Heart size={80} fill="white" className="text-white drop-shadow-lg" />
              </div>
            ) : coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <Music2 size={80} className="text-text-muted opacity-50" />
            )}
          </div>

          {/* Playlist Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0">
            <span className="text-xs font-bold tracking-widest uppercase text-white/70 mb-2">
              {isLiked ? 'Collection' : 'Playlist'}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 line-clamp-2 drop-shadow-md">
              {title}
            </h1>
            <p className="text-sm font-medium text-white/80">
              Pandoos <span className="mx-1">•</span> {trackCount} {trackCount === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 md:px-8 py-4 flex items-center gap-4 relative z-10 bg-surface-base/80 backdrop-blur-md sticky top-0 border-b border-white/5">
        <button 
          onClick={handlePlayAll}
          disabled={!trackCount}
          className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={28} fill="currentColor" className="ml-1" />
        </button>
        <button 
          onClick={handleShufflePlay}
          disabled={!trackCount}
          className={`p-3 rounded-full transition-all ${isShuffling ? 'text-brand-primary bg-brand-primary/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        >
          <Shuffle size={24} />
        </button>
        {!isLiked && (
          <button className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all ml-auto">
            <MoreHorizontal size={24} />
          </button>
        )}
      </div>

      {/* Tracks List */}
      <div className="px-2 md:px-6 py-4 flex flex-col gap-1 relative z-10">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-xl skeleton" />
            ))}
          </div>
        ) : tracks && tracks.length > 0 ? (
          <>
            {tracks.map((track, index) => (
              <PlaylistTrackItem 
                key={`${track.id}-${index}`} 
                track={track} 
                index={index} 
                onPlay={() => playTrack(track, tracks)}
                isLikedPlaylist={isLiked}
                onRemove={!isLiked ? () => {
                  if (id) removeTrack.mutate({ playlistId: id, videoId: track.videoId });
                } : undefined}
              />
            ))}
            {!isLiked && (
              <button 
                onClick={() => setIsAddSongsModalOpen(true)}
                className="mt-4 mx-auto flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors font-bold text-sm"
              >
                <Plus size={18} />
                Find more songs
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-text-muted flex flex-col items-center">
            <Music2 size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-white mb-2">It's quiet here...</h3>
            <p className="mb-6">Add some tracks to this {isLiked ? 'collection' : 'playlist'} to get started.</p>
            {!isLiked && (
              <button 
                onClick={() => setIsAddSongsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Plus size={18} />
                Add Songs
              </button>
            )}
          </div>
        )}
      </div>

      {!isLiked && id && (
        <AddSongsSearchModal 
          isOpen={isAddSongsModalOpen}
          onClose={() => setIsAddSongsModalOpen(false)}
          playlistId={id}
        />
      )}
    </div>
  );
}
