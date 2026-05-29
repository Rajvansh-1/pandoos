import { NavLink } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore, computeXP, getRankForXP } from '@/stores/useGamificationStore';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/library', icon: Library, label: 'Library' },
];

export function BottomNav() {
  const user = useAuthStore((state) => state.user);
  const gamification = useGamificationStore();
  const xp = computeXP(gamification);
  const rank = getRankForXP(xp);
  const earnedBadges = gamification.earnedBadges.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/90 backdrop-blur-2xl border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-[var(--bottom-nav-height)] px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1 touch-highlight transition-colors',
                isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-primary"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Profile Tab — Premium XP-aware button */}
        <NavLink
          to={user ? "/profile" : "/login"}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 touch-highlight transition-all"
        >
          {({ isActive }) => (
            <>
              {/* Avatar / Rank ring */}
              <div className={cn(
                'relative w-8 h-8 rounded-full transition-all duration-300',
                isActive ? 'scale-110' : 'scale-100'
              )}>
                {/* Rank gradient ring */}
                <div className={cn(
                  'absolute inset-0 rounded-full bg-gradient-to-br',
                  rank.color,
                  'p-[2px]'
                )}>
                  <div className="w-full h-full rounded-full bg-surface-elevated overflow-hidden flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">{rank.emoji}</span>
                    )}
                  </div>
                </div>

                {/* Badge count bubble */}
                {earnedBadges > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-surface-base flex items-center justify-center">
                    <span className="text-[8px] font-black text-black">{earnedBadges}</span>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot-profile"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-primary"
                  />
                )}
              </div>

              <span className={cn(
                'text-[10px] font-medium tracking-wide transition-colors',
                isActive ? 'text-brand-primary' : 'text-text-muted'
              )}>
                {user ? rank.name.split(' ')[0] : 'Sign In'}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
