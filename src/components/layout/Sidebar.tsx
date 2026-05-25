import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore, computeXP, getRankForXP, getXPProgress } from '@/stores/useGamificationStore';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { to: '/', icon: <Home size={20} />, label: 'Home' },
  { to: '/search', icon: <Search size={20} />, label: 'Explore' },
  { to: '/library', icon: <Library size={20} />, label: 'Library' },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  const gamification = useGamificationStore();
  const xp = computeXP(gamification);
  const rank = getRankForXP(xp);
  const xpProgress = getXPProgress(xp);
  const streak = gamification.streakDays;
  const earnedBadges = gamification.earnedBadges.length;

  const circumference = 2 * Math.PI * 22;
  const dash = (xpProgress.percent / 100) * circumference;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <aside 
      className="w-64 h-full border-r border-white/5 flex flex-col pt-6 pb-6 z-30 shrink-0 backdrop-blur-2xl"
      style={{ backgroundColor: 'hsl(var(--surface-base) / 0.6)' }}
    >

      {/* Brand */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <img src="/logo.png" alt="Pandoos" className="w-12 h-12 object-contain drop-shadow-xl" />
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">Pandoos</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scroll-container px-3 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Profile Card or Login */}
      <div className="px-3 flex flex-col gap-3">
        {user ? (
          <>
            {/* Profile card — clickable, navigates to /profile */}
            <motion.button
              onClick={() => navigate('/profile')}
              whileTap={{ scale: 0.97 }}
              className="w-full text-left p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* XP ring around avatar */}
                <div className="relative shrink-0">
                  <svg width="48" height="48" className="-rotate-90">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle
                      cx="24" cy="24" r="22" fill="none" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${dash} ${circumference}`}
                      style={{ stroke: 'url(#sidebarXP)' }}
                    />
                    <defs>
                      <linearGradient id="sidebarXP" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--color-primary))" />
                        <stop offset="100%" stopColor="hsl(var(--color-accent))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-1.5 rounded-full overflow-hidden bg-surface-base">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">{rank.emoji}</div>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.username.split(' ')[0]}</p>
                  <p className={`text-xs font-semibold bg-gradient-to-r ${rank.color} bg-clip-text text-transparent`}>
                    {rank.name}
                  </p>
                  <p className="text-[10px] text-white/40">{xp} XP · {earnedBadges} badges</p>
                </div>
              </div>

              {/* Streak & go arrow */}
              <div className="flex items-center justify-between mt-2.5 px-1">
                {streak > 0 ? (
                  <div className="flex items-center gap-1 text-orange-400">
                    <Flame size={11} />
                    <span className="text-[11px] font-bold">{streak} day streak</span>
                  </div>
                ) : <div />}
                <span className="text-white/20 group-hover:text-white/50 text-xs transition-colors">→</span>
              </div>
            </motion.button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings size={16} />
              Settings
            </button>

            {/* Logout */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-transform text-sm"
          >
            <LogIn size={16} />
            Sign In
          </NavLink>
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </aside>
  );
}
