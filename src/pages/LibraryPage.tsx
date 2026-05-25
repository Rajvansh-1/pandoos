import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Plus, Heart, Music2, LogIn, Library as LibraryIcon, Users } from 'lucide-react';
import { usePlaylists, useLikedSongs, useCreatePlaylist, useFollowedArtists } from '@/features/library/hooks/useLibrary';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { CreatePlaylistModal } from '@/features/library/components/CreatePlaylistModal';
import { cn } from '@/utils/cn';

export function LibraryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const openArtist = useUIStore((state) => state.openArtist);
  
  const { data: playlists, isLoading: loadingPlaylists } = usePlaylists();
  const { data: likedSongs, isLoading: loadingLiked } = useLikedSongs();
  const { data: followedArtists, isLoading: loadingArtists } = useFollowedArtists();
  
  const createPlaylist = useCreatePlaylist();
  const [isCreating, setIsCreating] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center pb-20 bg-surface-base">
        <Helmet>
          <title>Library | Pandoos</title>
        </Helmet>
        <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(var(--brand-primary),0.3)]">
          <LibraryIcon size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">Your Music Library</h2>
        <p className="text-white/60 mb-10 max-w-sm">Sign in to curate your personal playlists and keep track of all your favorite tracks.</p>
        <button 
          onClick={() => signInWithGoogle()}
          className="flex items-center gap-3 px-8 py-4 bg-white text-surface-base font-bold rounded-full touch-highlight shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    );
  }

  const handleCreatePlaylist = (name: string, description: string) => {
    createPlaylist.mutate(
      { name, description },
      {
        onSuccess: () => {
          setIsCreating(false);
        }
      }
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto scroll-container pb-nav bg-surface-base relative">
      <Helmet>
        <title>Your Library | Pandoos</title>
        <meta name="description" content="Your saved playlists and liked songs on Pandoos." />
      </Helmet>

      {/* Header Background Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-brand-primary/20 to-transparent pointer-events-none" />

      <div className="px-4 md:px-8 pt-safe relative z-10 mt-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Your Library</h1>
          <button 
            onClick={() => setIsCreating(true)}
            aria-label="Create new playlist"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white touch-highlight transition-all"
          >
            <Plus size={20} />
            <span className="hidden sm:inline font-medium">Create</span>
          </button>
        </div>

        {/* Liked Songs Hero Card */}
        <button 
          onClick={() => navigate('/playlist/liked')}
          className="w-full relative overflow-hidden rounded-3xl p-6 md:p-8 mb-10 text-left group touch-highlight transition-transform hover:scale-[1.01] active:scale-[0.99] border border-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/80 to-brand-accent/60 opacity-90" />
          <div className="absolute inset-0 bg-surface-elevated/20 backdrop-blur-sm" />
          {/* Animated glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md shadow-lg">
                <Heart size={24} fill="white" className="text-white drop-shadow-md" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 drop-shadow-md">Liked Songs</h2>
              <p className="text-white/80 font-medium">
                {loadingLiked ? 'Loading...' : `${likedSongs?.length ?? 0} tracks`}
              </p>
            </div>
            
            {likedSongs && likedSongs.length > 0 && (
              <div className="hidden sm:flex -space-x-4">
                {likedSongs.slice(0, 3).map((track, i) => (
                  <div key={track.id} className="w-14 h-14 rounded-full border-2 border-brand-primary overflow-hidden shadow-lg" style={{ zIndex: 3 - i }}>
                    <img src={track.albumArt} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Followed Artists */}
        {loadingArtists || (followedArtists && followedArtists.length > 0) ? (
          <div className="mb-10">
            <h2 className="text-xl font-display font-bold text-white mb-6">Artists</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-container">
              {loadingArtists ? (
                [1, 2, 3, 4].map(i => <div key={i} className="w-28 h-28 rounded-full skeleton shrink-0 snap-start" />)
              ) : (
                followedArtists!.map(artist => {
                  const thumbUrl = artist.thumbnails?.[0]?.url;
                  return (
                  <button 
                    key={artist.artistId}
                    onClick={() => openArtist(artist.artistId)}
                    className="shrink-0 snap-start flex flex-col items-center group w-28 text-center"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-brand-primary transition-colors shadow-lg relative bg-[#0a0a0f]">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-primary to-brand-accent text-white font-display font-bold text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-primary transition-colors">{artist.name}</span>
                  </button>
                )})
              )}
            </div>
          </div>
        ) : null}

        {/* Playlists Grid */}
        <h2 className="text-xl font-display font-bold text-white mb-6">Playlists</h2>
        
        {loadingPlaylists ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-2xl skeleton" />
            ))}
          </div>
        ) : playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-8">
            {playlists.map((playlist) => (
              <button 
                key={playlist.id} 
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="flex flex-col text-left group touch-highlight p-3 bg-surface-elevated/40 hover:bg-surface-elevated/80 rounded-2xl border border-white/5 transition-all hover:-translate-y-1 shadow-lg"
              >
                <div className="w-full aspect-square rounded-xl bg-surface-base mb-4 overflow-hidden shadow-inner flex items-center justify-center relative">
                  {playlist.coverUrl ? (
                    <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-surface-base flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                      <Music2 size={40} className="text-white/20" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white truncate px-1">{playlist.name}</h3>
                <p className="text-xs text-text-muted px-1 mt-1 font-medium">{playlist.trackCount} tracks</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-surface-elevated/30 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
              <LibraryIcon size={32} className="text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No playlists yet</h3>
            <p className="text-white/60 mb-6">Create your first playlist and start building your collection.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-white text-surface-base font-bold rounded-full hover:scale-105 transition-transform"
            >
              Create Playlist
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePlaylistModal 
        isOpen={isCreating} 
        onClose={() => setIsCreating(false)} 
        onSubmit={handleCreatePlaylist}
        isLoading={createPlaylist.isPending}
      />
    </div>
  );
}
