import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { useGamificationStore, computeXP, getRankForXP } from '@/stores/useGamificationStore';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, User, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export function TopBar() {
  const user = useAuthStore((state) => state.user);
  const isPlayerOpen = useUIStore((state) => state.isPlayerOpen);
  const navigate = useNavigate();

  const gamification = useGamificationStore();
  const xp = computeXP(gamification);
  const rank = getRankForXP(xp);
  const streak = gamification.streakDays;
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Hide the top bar when the full-screen player is open
  if (isPlayerOpen) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pt-safe backdrop-blur-2xl border-b border-white/5 transition-opacity duration-300"
      style={{ background: 'rgba(10,10,15,0.85)' }}
    >
      <div className="flex items-center justify-between h-[var(--top-bar-height)] px-4">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Pandoos" className="w-10 h-10 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Pandoos
          </span>
        </div>

        {/* Right: Streak pill + Profile Avatar */}
        <div className="flex items-center gap-2">

          {/* Streak pill — only show if user has a streak */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30"
            >
              <Flame size={13} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-300">{streak}d</span>
            </motion.div>
          )}

          {/* Settings Button */}
          <motion.button
            onClick={() => setIsSettingsOpen(true)}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-elevated border border-white/10 hover:bg-white/10 transition-colors group shadow-lg"
          >
            <Settings size={20} className="text-white/80 group-hover:text-white transition-colors" />
          </motion.button>

          {/* Show "Sign In" button if not logged in */}
          {!user && (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-bold hover:bg-brand-primary/30 transition-colors"
            >
              <User size={12} />
              Sign In
            </button>
          )}
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </header>
  );
}
