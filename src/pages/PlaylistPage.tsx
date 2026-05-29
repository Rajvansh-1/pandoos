import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Play, Shuffle, Heart, ArrowLeft, Trash2, Music2, Plus, LogIn, Edit2, GripVertical } from 'lucide-react';
import { usePlaylists, usePlaylistTracks, useLikedSongs, useRemoveTrackFromPlaylist, useDeletePlaylist, useUpdatePlaylistDetails, useReorderPlaylistTracks } from '@/features/library/hooks/useLibrary';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Reorder } from 'framer-motion';
import { PlaylistTrackItem } from '@/features/library/components/PlaylistTrackItem';
import { AddSongsSearchModal } from '@/features/library/components/AddSongsSearchModal';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isLiked = id === 'liked';

  const user = useAuthStore((state) => state.user);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

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
  const deletePlaylist = useDeletePlaylist();
  const updatePlaylist = useUpdatePlaylistDetails();
  const reorderTracks = useReorderPlaylistTracks();

  const [isAddSongsModalOpen, setIsAddSongsModalOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');

  const [localTracks, setLocalTracks] = React.useState(tracks || []);

  React.useEffect(() => {
    setLocalTracks(tracks || []);
  }, [tracks]);

  const handleReorder = (newOrder: any[]) => {
    setLocalTracks(newOrder);
    if (!isLiked && id) {
      reorderTracks.mutate({ playlistId: id, trackIds: newOrder.map(t => t.videoId) });
    }
  };

  const handleSaveEdit = () => {
    if (id && editName.trim()) {
      updatePlaylist.mutate({ playlistId: id, name: editName.trim(), description: editDesc.trim() }, {
        onSuccess: () => setIsEditing(false)
      });
    }
  };

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
  
  const totalDurationSeconds = tracks?.reduce((acc, t) => acc + (t.duration || 0), 0) || 0;
  const formattedDuration = React.useMemo(() => {
    if (!totalDurationSeconds) return '';
    const hours = Math.floor(totalDurationSeconds / 3600);
    const mins = Math.floor((totalDurationSeconds % 3600) / 60);
    if (hours > 0) return ` • ${hours} hr ${mins} min`;
    return ` • ${mins} min`;
  }, [totalDurationSeconds]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center pb-20 bg-surface-base">
        <Helmet>
          <title>Playlist | Pandoos</title>
        </Helmet>
        <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(var(--brand-primary),0.3)]">
          <Music2 size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">Login Required</h2>
        <p className="text-white/60 mb-10 max-w-sm">Sign in to view and manage your personal playlists, or to explore advance features.</p>
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
          <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 flex-1">
            <span className="text-xs font-bold tracking-widest uppercase text-white/70 mb-2">
              {isLiked ? 'Collection' : 'Playlist'}
            </span>
            <div className="flex items-center gap-3 mb-2 group">
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white line-clamp-2 drop-shadow-md">
                {title}
              </h1>
              {!isLiked && (
                <button 
                  onClick={() => {
                    setEditName(playlist?.name || '');
                    setEditDesc(playlist?.description || '');
                    setIsEditing(true);
                  }}
                  className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100"
                >
                  <Edit2 size={20} />
                </button>
              )}
            </div>
            {playlist?.description && (
              <p className="text-white/70 mb-2 font-medium max-w-lg">{playlist.description}</p>
            )}
            <p className="text-sm font-medium text-white/80 mt-2">
              Pandoos <span className="mx-1">•</span> {trackCount} {trackCount === 1 ? 'song' : 'songs'}{formattedDuration}
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
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this playlist?')) {
                if (id) {
                  deletePlaylist.mutate(id, {
                    onSuccess: () => navigate('/library')
                  });
                }
              }
            }}
            className="p-3 text-white/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all ml-auto"
            title="Delete Playlist"
          >
            <Trash2 size={24} />
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
        ) : localTracks && localTracks.length > 0 ? (
          <>
            {isLiked ? (
              localTracks.map((track, index) => (
                <PlaylistTrackItem 
                  key={`${track.id}-${index}`} 
                  track={track} 
                  index={index} 
                  onPlay={() => playTrack(track, localTracks)}
                  isLikedPlaylist={isLiked}
                />
              ))
            ) : (
              <Reorder.Group axis="y" values={localTracks} onReorder={handleReorder} className="flex flex-col gap-1">
                {localTracks.map((track, index) => (
                  <Reorder.Item key={`${track.videoId}-${index}`} value={track}>
                    <div className="flex items-center group relative">
                      <div className="absolute left-0 -ml-6 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-full">
                        <PlaylistTrackItem 
                          track={track} 
                          index={index} 
                          onPlay={() => playTrack(track, localTracks)}
                          isLikedPlaylist={false}
                          onRemove={() => {
                            if (id) {
                              removeTrack.mutate({ playlistId: id, videoId: track.videoId }, {
                                onSuccess: () => {
                                  if (localTracks.length === 1) {
                                    deletePlaylist.mutate(id, {
                                      onSuccess: () => navigate('/library')
                                    });
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
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

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  placeholder="Playlist Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Description</label>
                <textarea 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-primary transition-colors resize-none h-24"
                  placeholder="Add an optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-full text-white/70 hover:text-white font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={!editName.trim() || updatePlaylist.isPending}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-full font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {updatePlaylist.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
