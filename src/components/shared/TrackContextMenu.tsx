import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Heart, ListMusic, Play, Plus, Disc, User, Trash2 } from 'lucide-react';
import type { Track } from '@/types/track';
import { AddToPlaylistModal } from '@/features/library/components/AddToPlaylistModal';
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from '@/features/library/hooks/useLibrary';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/utils/cn';

interface TrackContextMenuProps {
  track: Track;
  className?: string;
  onClose?: () => void;
  onRemove?: () => void;
}

export function TrackContextMenu({ track, className, onClose, onRemove }: TrackContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: isLiked } = useIsTrackLiked(track.videoId);
  const likeTrack = useLikeTrack();
  const unlikeTrack = useUnlikeTrack();
  
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const prependToQueue = usePlayerStore((state) => state.prependToQueue);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleLikeToggle = () => {
    if (isLiked) {
      unlikeTrack.mutate(track.videoId);
    } else {
      likeTrack.mutate(track);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn("p-2 text-text-muted hover:text-white rounded-full hover:bg-white/10 transition-colors touch-highlight", className)}
      >
        <MoreVertical size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden backdrop-blur-md"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLikeToggle();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm"
            >
              <Heart size={18} className={isLiked ? "text-brand-primary fill-brand-primary" : "text-white/70"} />
              <span className={isLiked ? "text-brand-primary font-medium" : "text-white"}>
                {isLiked ? 'Liked' : 'Like'}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setShowAddModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm text-white"
            >
              <ListMusic size={18} className="text-white/70" />
              <span>Save to Playlist</span>
            </button>

            {track.artistId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  useUIStore.getState().openArtist(track.artistId!);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm text-white"
              >
                <User size={18} className="text-white/70" />
                <span className="truncate">View Artist</span>
              </button>
            )}

            {track.albumId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  useUIStore.getState().openAlbum(track.albumId!);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm text-white"
              >
                <Disc size={18} className="text-white/70" />
                <span className="truncate">View Album</span>
              </button>
            )}

            <div className="h-px w-full bg-white/10 my-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                prependToQueue([track]);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm text-white"
            >
              <Play size={18} className="text-white/70" />
              <span>Play Next</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm text-white"
            >
              <Plus size={18} className="text-white/70" />
              <span>Add to Queue</span>
            </button>

            {onRemove && (
              <>
                <div className="h-px w-full bg-white/10 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left text-sm text-red-400 group"
                >
                  <Trash2 size={18} className="text-red-400/70 group-hover:text-red-400" />
                  <span>Remove from Playlist</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AddToPlaylistModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        track={track}
      />
    </div>
  );
}
