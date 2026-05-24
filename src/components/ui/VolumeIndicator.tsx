import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';

export function VolumeIndicator() {
  const volume = usePlayerStore((state) => state.volume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsVisible(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [volume, isMuted]);

  const effectiveVolume = isMuted ? 0 : volume;

  let Icon = Volume2;
  if (effectiveVolume === 0) Icon = VolumeX;
  else if (effectiveVolume < 0.5) Icon = Volume1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center gap-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[200px]"
        >
          <Icon className="text-white w-6 h-6 shrink-0" />
          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${effectiveVolume * 100}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            />
          </div>
          <span className="text-white font-bold text-sm min-w-[3ch] text-right">
            {Math.round(effectiveVolume * 100)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
