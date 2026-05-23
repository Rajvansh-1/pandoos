import React from 'react';
import { Play, Pause, MoreVertical } from 'lucide-react';
import { TrackImage } from '@/components/shared/TrackImage';
import { usePlayerStore } from '@/stores/usePlayerStore';
import type { Track } from '@/types/track';
import { cn } from '@/utils/cn';
import { TrackContextMenu } from '@/components/shared/TrackContextMenu';

interface PlaylistTrackItemProps {
  track: Track;
  index: number;
  onPlay: () => void;
  onRemove?: () => void;
  isLikedPlaylist?: boolean;
}

export function PlaylistTrackItem({ track, index, onPlay, onRemove, isLikedPlaylist }: PlaylistTrackItemProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);

  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlayClick = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      onPlay();
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors touch-highlight relative">
      {/* Index / Play Button */}
      <div className="w-8 text-center shrink-0 hidden sm:block">
        {isCurrentTrack && isPlaying ? (
          <div className="w-4 h-4 mx-auto flex items-end justify-center gap-[2px]">
            <div className="w-1 bg-brand-primary h-full animate-[bounce_1s_infinite]" />
            <div className="w-1 bg-brand-primary h-2/3 animate-[bounce_1.2s_infinite]" />
            <div className="w-1 bg-brand-primary h-4/5 animate-[bounce_0.8s_infinite]" />
          </div>
        ) : (
          <span className="text-text-muted group-hover:hidden text-sm font-medium">{index + 1}</span>
        )}
        <button
          onClick={handlePlayClick}
          className={cn(
            "mx-auto text-white hidden group-hover:block transition-all active:scale-90",
            isCurrentTrack ? "block" : ""
          )}
        >
          {isCurrentTrack && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 shadow-md cursor-pointer" onClick={handlePlayClick}>
          <TrackImage videoId={track.videoId} title={track.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-center min-w-0 cursor-pointer" onClick={handlePlayClick}>
          <p className={cn(
            "text-sm font-semibold truncate",
            isCurrentTrack ? "text-brand-primary" : "text-white"
          )}>
            {track.title}
          </p>
          <p className="text-xs text-text-muted truncate hover:text-white transition-colors">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Duration */}
      <div className="hidden md:block text-sm text-text-muted w-16 text-right">
        {formatDuration(track.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <TrackContextMenu track={track} />
      </div>
    </div>
  );
}
