import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Music, ArrowRight, Check } from 'lucide-react';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTasteStore } from '@/stores/useTasteStore';

const GENRES = [
  { id: 'bollywood', label: 'Bollywood', icon: '💫' },
  { id: 'desi', label: 'Desi/Punjabi', icon: '🔥' },
  { id: 'sufi', label: 'Sufi', icon: '🕊️' },
  { id: 'devotional', label: 'Devotional', icon: '🛕' },
  { id: 'lofi', label: 'Lo-Fi/Chill', icon: '🍃' },
  { id: 'electronic', label: 'Electronic/EDM', icon: '⚡' },
  { id: 'rock', label: 'Rock', icon: '🎸' },
  { id: 'acoustic', label: 'Acoustic', icon: '🎻' },
  { id: 'pop', label: 'Pop', icon: '✨' },
];

export function OnboardingFlow() {
  const user = useAuthStore(state => state.user);
  const setTopGenres = useTasteStore(state => state.setTopGenres);
  
  // Local state
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.username || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // If user already has genres set, they've done onboarding
  const hasGenres = useTasteStore(state => state.topGenres.length > 0);
  if (hasGenres || isComplete) return null;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep(2);
    }
  };

  const handleToggleGenre = (id: string) => {
    setSelectedGenres(prev => 
      prev.includes(id) 
        ? prev.filter(g => g !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleFinish = () => {
    if (selectedGenres.length > 0) {
      setTopGenres(selectedGenres);
      setIsComplete(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 animate-pulse pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-surface-base border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10"
          >
            <div className="flex justify-center mb-6">
              <PandaMascot size={100} emotion="happy" />
            </div>
            <h2 className="text-3xl font-display font-extrabold text-white text-center mb-2">Welcome to Pandoos</h2>
            <p className="text-white/60 text-center mb-8">What should I call you?</p>
            
            <form onSubmit={handleNextStep1} className="flex flex-col gap-4">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-brand-primary focus:bg-white/10 transition-all text-lg"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full bg-brand-primary text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
              >
                Let's Go <ArrowRight size={18} />
              </button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg bg-surface-base border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10"
          >
            <div className="flex justify-center mb-4">
              <PandaMascot size={80} emotion="focus" />
            </div>
            <h2 className="text-2xl font-display font-extrabold text-white text-center mb-2">What's your vibe, {name}?</h2>
            <p className="text-white/60 text-center mb-6">Pick up to 3 genres you love</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre.id);
                const isDisabled = !isSelected && selectedGenres.length >= 3;
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleToggleGenre(genre.id)}
                    disabled={isDisabled}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border ${
                      isSelected 
                        ? 'bg-brand-primary/20 border-brand-primary text-white shadow-glow-sm scale-105'
                        : isDisabled
                          ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-2xl">{genre.icon}</span>
                    <span className="font-semibold text-sm">{genre.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleFinish}
              disabled={selectedGenres.length === 0}
              className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-glow-md"
            >
              <Sparkles size={18} /> Start Listening
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
