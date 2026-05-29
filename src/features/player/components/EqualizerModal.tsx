import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/utils/cn';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [6, 4, 0, -2, -4] },
  { name: 'Vocal', bands: [-2, -1, 4, 5, 2] },
  { name: 'Rock', bands: [5, 3, -1, 3, 5] },
  { name: 'Electronic', bands: [6, 4, 0, 2, 5] },
  { name: 'Acoustic', bands: [3, 2, 1, 2, 3] },
];

const BAND_FREQS = ['60', '230', '910', '3.6k', '14k'];

export function EqualizerModal({ isOpen, onClose }: EqualizerModalProps) {
  const { equalizer, setEqualizer } = useSettingsStore();

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...equalizer.bands];
    newBands[index] = value;
    setEqualizer('Custom', newBands);
  };

  const applyPreset = (presetName: string, presetBands: number[]) => {
    setEqualizer(presetName, presetBands);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[601] max-w-lg mx-auto bg-[#0a0f0d] rounded-t-3xl border-t border-emerald-900/30 overflow-hidden pb-safe"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center py-4" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            <div className="px-6 pb-8">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <SlidersHorizontal size={20} className="text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg">Equalizer</h3>
                  <p className="text-white/50 text-sm">Fine-tune your audio experience</p>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 text-white/50 hover:text-white rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* Sliders */}
              <div className="flex justify-between items-end h-48 mb-8 px-2">
                {equalizer.bands.map((gain, i) => (
                  <div key={i} className="flex flex-col items-center gap-4 flex-1">
                    <span className="text-xs text-white/50 font-medium">
                      {gain > 0 ? '+' : ''}{gain}dB
                    </span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={gain}
                      onChange={(e) => handleBandChange(i, parseInt(e.target.value))}
                      className="w-32 h-1.5 -rotate-90 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                        [&::-webkit-slider-thumb]:bg-brand-primary"
                    />
                    <span className="text-xs text-white/50 font-bold mt-16">{BAND_FREQS[i]}</span>
                  </div>
                ))}
              </div>

              {/* Presets */}
              <div>
                <h4 className="text-sm font-bold text-white/80 mb-3">Presets</h4>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset.name, preset.bands)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-sm font-medium transition-all text-center",
                        equalizer.preset === preset.name
                          ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-6 text-center">
                  Note: Equalizer only applies to offline downloaded tracks.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
