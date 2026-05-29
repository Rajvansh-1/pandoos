import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ListMusic, Music2, LogIn } from 'lucide-react';
import { usePlaylists, useAddTrackToPlaylist, useCreatePlaylist } from '@/features/library/hooks/useLibrary';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { Track } from '@/types/track';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export function AddToPlaylistModal({ isOpen, onClose, track }: Props) {
  const { data: playlists } = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const addTrackToPlaylist = useAddTrackToPlaylist();
  
  const user = useAuthStore((state) => state.user);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const addToast = useToastStore((state) => state.addToast);

  const handleCreate = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist.mutate(
      { name: newPlaylistName.trim() },
      {
        onSuccess: (newPlaylist) => {
          setNewPlaylistName('');
          setIsCreating(false);
          addToast('Playlist created successfully!', 'success');
          // Automatically add the track to the newly created playlist
          handleAddToPlaylist(newPlaylist.id);
        }
      }
    );
  };

  const handleAddToPlaylist = (playlistId: string) => {
    // We pass a high position number to append to the end
    addTrackToPlaylist.mutate({ playlistId, track, position: Date.now() }, {
      onSuccess: () => {
        addToast('Song added to playlist!', 'success');
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 sm:p-0 isolate pointer-events-none">
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
          className="relative w-full max-w-md bg-surface-elevated rounded-[2rem] p-6 border border-white/10 shadow-2xl z-[10000] pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ListMusic className="text-brand-primary" />
              Save to Playlist
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Music2 size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Login Required</h3>
              <p className="text-white/60 mb-8 max-w-sm">Sign in to curate your personal playlists and explore advance features.</p>
              <button 
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 px-6 py-3 bg-white text-surface-base font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <LogIn size={18} />
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto scroll-container pb-4">
              {isCreating ? (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 bg-transparent text-white outline-none px-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button 
                    onClick={handleCreate}
                    disabled={createPlaylist.isPending}
                    className="px-4 py-1.5 bg-brand-primary text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/20 hover:border-brand-primary hover:bg-brand-primary/10 transition-colors text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-primary/20">
                    <Plus className="text-white/70 group-hover:text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-brand-primary">New Playlist</h3>
                    <p className="text-xs text-white/50">Create a custom playlist</p>
                  </div>
                </button>
              )}

              {playlists?.map((playlist) => {
                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 text-left transition-colors hover:bg-white/10"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                      {playlist.coverUrl ? (
                         <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{playlist.name}</h3>
                      <p className="text-xs text-white/50">{playlist.trackCount} tracks</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
