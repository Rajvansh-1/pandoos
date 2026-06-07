import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTasteStore } from '@/stores/useTasteStore';
import { followArtist } from '@/services/library';
import { cn } from '@/utils/cn';

const GENRES = [
  { id: 'bollywood', label: 'Bollywood', icon: '💫' },
  { id: 'desi', label: 'Desi Swag', icon: '🔥' },
  { id: 'sufi', label: 'Sufi Soul', icon: '🕊️' },
  { id: 'lofi', label: 'Lo-Fi Chill', icon: '🍃' },
  { id: 'electronic', label: 'EDM', icon: '⚡' },
  { id: 'pop', label: 'Pop Hits', icon: '✨' },
  { id: 'hiphop', label: 'Hip-Hop', icon: '🎤' },
  { id: 'acoustic', label: 'Acoustic', icon: '🎸' },
  { id: 'devotional', label: 'Devotional', icon: '🛕' },
];

const ARTISTS = [
  { id: "UCDxKh1gFWeYsqePvgVzmPoQ", name: "Arijit Singh", thumbnail: "https://lh3.googleusercontent.com/W_yOqnKSDYyeVOY_AsXhuAtb6rW3vCL3GtJ9DA1GxWOrJfyeSOqzvTv_TkFHijdkVPXWutASBlRFPg=w200-h200-p-l90-rj" },
  { id: "UCJ2m-WpROlZCiZZID9r7NSQ", name: "Diljit Dosanjh", thumbnail: "https://yt3.googleusercontent.com/7EYXXMXY594V8y4sZT2aawmdKgDAGTu5jNm9C-HpR3jY9cZJ0NMxS__nZKBdWZ1PUpJPjc2BAA=w200-h200-l90-rj" },
  { id: "UClmXPfaYhXOYsNn_QUyheWQ", name: "Ed Sheeran", thumbnail: "https://lh3.googleusercontent.com/jQoBIAS6JjFGpcqQY1M_Mh3AasOvFENCdVRxkgax1a0K6qiq7AgE3MbJ6Jtt-Jndcarvoawmrg66KTny=w200-h200-p-l90-rj" },
  { id: "UClYV6hHlupm_S_ObS1W-DYw", name: "The Weeknd", thumbnail: "https://lh3.googleusercontent.com/U-SAmNOu4TynE818gLCfKsuHZ0U5YNEtO9mrjSI9WCCKERs98LzrCal5kajBBTQNwdcisoB2Bn-pHp4=w200-h200-p-l90-rj" },
  { id: "UCPC0L1d253x-KuMNwa05TpA", name: "Taylor Swift", thumbnail: "https://yt3.googleusercontent.com/RCpTA6EXJQyjVFDosWOKa2SMmqkua_lA9mHPDWWciLwgqpZLz-k8rXWRF_367trrQ7up9BUwCbk6kRk=w200-h200-p-l90-rj" },
  { id: "UCrC-7fsdTCYeaRBpwA6j-Eg", name: "Shreya Ghoshal", thumbnail: "https://yt3.ggpht.com/PgINZNe0qVxgMSXKG5vF82bNN4WCC12zgWsz9I7OLs4CLF9Cn0Vxq7Xc1ToupnzXrCv0nKfe3VM=w200-c-h200-k-c0x00ffffff-no-l90-rj" },
  { id: "UCVfSAUepe_FzP6ge6WexO5Q", name: "Badshah", thumbnail: "https://lh3.googleusercontent.com/bbR8znm7CX07mCGQH-M484ckFRaKkSmTjwrwuFZxQUBy7Uc5gQcintkpqDXCuSX0DdLLg2aPskZhC2s=w200-h200-p-l90-rj" },
  { id: "UCQmNiXx378nooDuZPA2fTAg", name: "AP Dhillon", thumbnail: "https://lh3.googleusercontent.com/yJh1MZL2FvtJz3YeDAUhTRpfdUSwdotWw8XmB_An-4coKiVG4pDpUGRAPV7ooqmzBP4HAWrtjPyAfI4=w200-h200-p-l90-rj" },
  { id: "UCSmK5WX5U4gdtebWjoL81og", name: "Karan Aujla", thumbnail: "https://lh3.googleusercontent.com/k7sgqqcV5VScaMZtTmS8W_tfouLVBpgyJII0epYE2Vjw1-zzhGgUCV51aHxZn6cmZKKJgUfNlIVpZg=w200-h200-p-l90-rj" },
  { id: "UCVGomUS__PL0c4jDXa0QwXA", name: "Atif Aslam", thumbnail: "https://yt3.googleusercontent.com/ykJkyILKum4B2oudDxjnf5WNenWWZAp-WEz0_CHp4cu0VnqB2-uaNDylItqC68WLXV62rdHDun-ahbg=w200-h200-p-l90-rj" },
  { id: "UCIOXXUXQ8y5ivei97JkiBAw", name: "Sidhu Moose Wala", thumbnail: "https://yt3.ggpht.com/ytc/AIdro_kiQJ0Hhp0O-tdaY1dy81-gSNujjccUlWstnpFr686ZlMk=w200-h200-l90-rj" },
  { id: "UCU6cE7pdJPc6DU2jSrKEsdQ", name: "Drake", thumbnail: "https://yt3.googleusercontent.com/MxNjcRJ-uK4Xvx7u90IhEFLQM8x9LIGTA9VCKHq5U4Wn2jOgiWaMtg-qz329SIzqnCyhdCCB3MpdAGs=w200-h200-p-l90-rj" }
];

export function OnboardingFlow() {
  const user = useAuthStore(state => state.user);
  const setTopGenres = useTasteStore(state => state.setTopGenres);
  const setTopArtists = useTasteStore(state => state.setTopArtists);
  
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<typeof ARTISTS>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const hasGenres = useTasteStore(state => state.topGenres.length > 0);
  if (hasGenres) return null;

  const name = user?.username?.split(' ')[0] || 'there';

  const handleToggleGenre = (id: string) => {
    setSelectedGenres(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleToggleArtist = (artist: typeof ARTISTS[0]) => {
    setSelectedArtists(prev => 
      prev.find(a => a.id === artist.id) ? prev.filter(a => a.id !== artist.id) : [...prev, artist]
    );
  };

  const handleNext = () => {
    if (selectedGenres.length > 0) setStep(2);
  };

  const handleFinish = async () => {
    if (selectedArtists.length > 0) {
      setIsCompleting(true);
      
      // Async database follows if logged in
      if (user) {
        selectedArtists.forEach(artist => {
          followArtist(user.id, {
            artistId: artist.id,
            name: artist.name,
            thumbnails: [{ url: artist.thumbnail }]
          }).catch(console.error);
        });
      }

      await new Promise(r => setTimeout(r, 600));
      setTopGenres(selectedGenres);
      setTopArtists(selectedArtists.map(a => a.name));
    }
  };

  return (
    <AnimatePresence>
      {!isCompleting && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-black/95 sm:bg-black/80 sm:backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden"
        >
          {/* Animated Ambient Orbs */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(var(--color-primary)/0.6)_0%,transparent_70%)] pointer-events-none" 
          />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(var(--color-secondary)/0.6)_0%,transparent_70%)] pointer-events-none" 
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
            className="w-full max-w-2xl bg-white/5 sm:backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] relative z-10 flex flex-col max-h-[90vh]"
          >
            {/* Shimmer reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none rounded-[2.5rem]" />

            {/* Header Area */}
            <div className="flex items-center justify-between mb-6 relative">
              {step === 2 ? (
                <button onClick={() => setStep(1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <ArrowLeft size={20} className="text-white" />
                </button>
              ) : <div className="w-9" />}
              
              <div className="flex space-x-2">
                <div className={cn("w-2 h-2 rounded-full transition-all duration-300", step === 1 ? "bg-brand-primary w-6" : "bg-white/20")} />
                <div className={cn("w-2 h-2 rounded-full transition-all duration-300", step === 2 ? "bg-brand-primary w-6" : "bg-white/20")} />
              </div>
              
              <div className="w-9" />
            </div>

            <motion.h2 
              key={`title-${step}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 text-center mb-2"
            >
              {step === 1 ? `Hey ${name}! What's your vibe?` : 'Who do you love listening to?'}
            </motion.h2>
            <motion.p 
              key={`subtitle-${step}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-white/60 text-center mb-6 font-medium"
            >
              {step === 1 ? 'Pick at least 1 genre to get started.' : 'Select at least 1 artist to follow.'}
            </motion.p>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar pb-24">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1"
                  >
                    {GENRES.map((genre, i) => {
                      const isSelected = selectedGenres.includes(genre.id);
                      return (
                        <motion.button
                          key={genre.id}
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03, type: "spring", damping: 20 }}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleGenre(genre.id)}
                          className={cn(
                            "p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 border relative overflow-hidden",
                            isSelected 
                              ? "bg-brand-primary/20 border-brand-primary/50 text-white shadow-[0_0_20px_hsl(var(--color-primary)/0.3)]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white"
                          )}
                        >
                          {isSelected && <motion.div layoutId="active-genre-bg" className="absolute inset-0 bg-brand-primary/20" />}
                          <span className="text-3xl relative z-10 drop-shadow-md">{genre.icon}</span>
                          <span className="font-bold text-xs relative z-10 tracking-wide">{genre.label}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-1"
                  >
                    {ARTISTS.map((artist, i) => {
                      const isSelected = !!selectedArtists.find(a => a.id === artist.id);
                      return (
                        <motion.button
                          key={artist.id}
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03, type: "spring", damping: 20 }}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleArtist(artist)}
                          className="flex flex-col items-center gap-2 group relative"
                        >
                          <div className={cn(
                            "w-full aspect-square rounded-full overflow-hidden border-2 transition-all duration-300 relative",
                            isSelected ? "border-brand-primary shadow-[0_0_25px_hsl(var(--color-primary)/0.6)] scale-110" : "border-transparent border-white/5 group-hover:border-white/20"
                          )}>
                            <img 
                              src={artist.thumbnail} 
                              alt={artist.name} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=random&color=fff&size=200&bold=true`;
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-brand-primary/30 flex items-center justify-center backdrop-blur-[2px]">
                                <Sparkles size={24} className="text-white drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "text-xs font-bold text-center line-clamp-2 transition-colors",
                            isSelected ? "text-white" : "text-white/60 group-hover:text-white/90"
                          )}>
                            {artist.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Floating Bottom Button */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none flex justify-center pb-8 pt-12 rounded-b-[2.5rem]">
              <AnimatePresence mode="wait">
                {(step === 1 && selectedGenres.length > 0) && (
                  <motion.button
                    key="next-btn"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    className="w-full sm:w-2/3 pointer-events-auto bg-white text-black font-black text-lg py-4 rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={20} />
                  </motion.button>
                )}
                {(step === 2 && selectedArtists.length > 0) && (
                  <motion.button
                    key="finish-btn"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleFinish}
                    className="w-full sm:w-2/3 pointer-events-auto bg-gradient-to-r from-brand-primary to-brand-accent text-white font-black text-lg py-4 rounded-full shadow-[0_10px_40px_hsl(var(--color-primary)/0.6)] flex items-center justify-center gap-2 overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Sparkles size={20} className="relative z-10" /> 
                    <span className="relative z-10">Tune My World</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
