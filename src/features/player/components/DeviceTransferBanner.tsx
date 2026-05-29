import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorPlay, Smartphone, Play, X, Headphones } from 'lucide-react';
import { getOtherDeviceNowPlaying, subscribeToNowPlaying } from '@/services/nowPlayingSync';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import type { Track } from '@/types/track';
import { TrackImage } from '@/components/shared/TrackImage';

interface RemoteDeviceState {
  track: Track;
  deviceName: string;
  isPlaying: boolean;
  progress?: number;
}

export function DeviceTransferBanner() {
  const user = useAuthStore(s => s.user);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [otherDevice, setOtherDevice] = useState<RemoteDeviceState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      setOtherDevice(null);
      return;
    }

    // Initial check
    getOtherDeviceNowPlaying(user.id).then(data => {
      if (data && !dismissed) setOtherDevice(data);
    });

    // Subscribe
    subscribeToNowPlaying(user.id, (track, deviceName, isPlaying, progress) => {
      if (!dismissed) {
        setOtherDevice({ track, deviceName, isPlaying, progress });
      }
    });

  }, [user, dismissed]);

  // If we're already playing the SAME track, we don't need to show the handoff banner
  if (!otherDevice || dismissed || (currentTrack && currentTrack.videoId === otherDevice.track.videoId)) {
    return null;
  }

  const handleTransfer = () => {
    if (!otherDevice) return;
    const { track, progress } = otherDevice;
    const store = usePlayerStore.getState();
    
    store.playTrack(track, [track]); 
    // Small timeout to allow player to initialize
    if (progress) {
       setTimeout(() => store.setProgress(progress), 500);
    }
    setDismissed(true);
    setOtherDevice(null);
  };

  const isMobileDevice = otherDevice.deviceName.toLowerCase().includes('android') || 
                         otherDevice.deviceName.toLowerCase().includes('iphone') ||
                         otherDevice.deviceName.toLowerCase().includes('ipad');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-[calc(100vw-32px)] w-[400px]"
      >
        <div className="bg-gradient-to-r from-surface-elevated/95 to-brand-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden group">
          {/* Animated top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary animate-[gradient_2s_linear_infinite] bg-[length:200%_auto]" />
          
          <div className="p-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <TrackImage 
                videoId={otherDevice.track.videoId} 
                title={otherDevice.track.title} 
                className="w-14 h-14 rounded-xl object-cover shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-brand-primary rounded-full flex items-center justify-center shadow-lg border-2 border-surface-elevated">
                {isMobileDevice ? <Smartphone size={14} className="text-white" /> : <MonitorPlay size={14} className="text-white" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Headphones size={12} className="text-brand-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  Listening on {otherDevice.deviceName}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{otherDevice.track.title}</h4>
              <p className="text-xs text-white/60 truncate">{otherDevice.track.artist}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleTransfer}
                className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Play size={18} fill="currentColor" className="ml-1" />
              </button>
              <button 
                onClick={() => setDismissed(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
