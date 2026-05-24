import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Clock, Zap, Music, TrendingUp, ChevronRight, Heart, X, Share2, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  useGamificationStore, computeXP, getRankForXP, getXPProgress,
  ALL_BADGES, PANDA_RANKS, type Badge,
} from '@/stores/useGamificationStore';
import { useThemeStore, THEMES } from '@/stores/useThemeStore';
import { APP_VERSION } from '@/utils/constants';

const PANDOOS_URL = 'https://pandoos.vercel.app';

// ─────────────────────────────────────────────
// Badge Detail Modal
// ─────────────────────────────────────────────
function BadgeDetailModal({ badge, earned, onClose }: { badge: Badge; earned: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const rarityLabel = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }[badge.rarity];
  const rarityColor = {
    common: 'text-slate-400 bg-slate-400/10',
    rare: 'text-blue-400 bg-blue-400/10',
    epic: 'text-violet-400 bg-violet-400/10',
    legendary: 'text-amber-400 bg-amber-400/10',
  }[badge.rarity];

  // Platform-specific shareable messages
  const shareMessages = {
    twitter: `🐼 Just earned the "${badge.name}" ${badge.emoji} badge on Pandoos Music!\n\n"${badge.description}"\n\nWhere Pandas Vibe 🎵 Try it free → ${PANDOOS_URL}\n\n#PandoosMusic #WhereePandasVibe`,
    whatsapp: `🐾 *Hey! I just unlocked a new badge on Pandoos Music!*\n\n${badge.emoji} *${badge.name}* (${rarityLabel})\n_"${badge.description}"_\n\nTry Pandoos Music free 👉 ${PANDOOS_URL}`,
    instagram: `🐼✨ New badge unlocked on Pandoos Music!\n\n${badge.emoji} ${badge.name} — ${rarityLabel}\n"${badge.description}"\n\nJoin me on the vibe → ${PANDOOS_URL} 🎵\n.\n.\n#PandoosMusic #MusicApp #PandaVibes #NowPlaying #MusicIsLife #NewBadge`,
    general: `I just earned the "${badge.name}" ${badge.emoji} badge on Pandoos Music — ${PANDOOS_URL}\n\n"${badge.description}"\n\n🐼 Where Pandas Vibe. Join free!`,
  };

  const copyMessage = (platform: keyof typeof shareMessages) => {
    navigator.clipboard.writeText(shareMessages[platform]);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `I earned: ${badge.name} on Pandoos!`,
        text: shareMessages.general,
        url: PANDOOS_URL,
      });
    } else {
      copyMessage('general');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[101] max-w-lg mx-auto rounded-t-3xl bg-[#0f0f12] border-t border-white/[0.08] overflow-hidden"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-6 pb-10 pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-3xl shadow-lg`}>
                {earned ? badge.emoji : '🔒'}
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-white">{badge.name}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rarityColor}`}>{rarityLabel}</span>
                <p className="text-xs text-white/30 mt-1">{earned ? 'Earned ✓' : 'Locked'}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Why you earned this</p>
            <p className="text-sm text-white/75 leading-relaxed">{badge.description}</p>
          </div>

          {/* Share section — only if earned */}
          {earned && (
            <div>
              <p className="text-xs text-white/35 uppercase tracking-wider mb-3">Share your achievement</p>

              {/* Quick native share */}
              <button
                onClick={handleNativeShare}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r ${badge.color} text-black font-bold text-sm mb-3 hover:opacity-90 active:scale-95 transition-all`}
              >
                <Share2 size={16} />
                Share Badge
              </button>

              {/* Platform-specific copy buttons */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'twitter', icon: '𝕏', label: 'Twitter/X' },
                  { key: 'whatsapp', icon: '💬', label: 'WhatsApp' },
                  { key: 'instagram', icon: '📸', label: 'Instagram' },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => copyMessage(key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] active:scale-95 transition-all"
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="text-[10px] text-white/50 font-medium">{label}</span>
                    {copied === key && <Check size={10} className="text-emerald-400" />}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-white/20 text-center mt-3">
                Copies platform-optimised caption to clipboard
              </p>
            </div>
          )}

          {!earned && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center">
              <p className="text-sm text-white/30">Keep listening to unlock this badge!</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────
// Badge Tile
// ─────────────────────────────────────────────
function BadgeTile({ id, earned, index, onClick }: { id: string; earned: boolean; index: number; onClick: () => void }) {
  const badge = ALL_BADGES.find((b) => b.id === id)!;
  if (!badge) return null;

  const rarityGlow = {
    common: '',
    rare: 'shadow-[0_0_12px_rgba(99,102,241,0.35)]',
    epic: 'shadow-[0_0_16px_rgba(167,139,250,0.45)]',
    legendary: 'shadow-[0_0_20px_rgba(251,191,36,0.55)]',
  }[badge.rarity];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
        earned
          ? `bg-white/[0.04] border-white/10 hover:border-white/25 hover:bg-white/[0.07] ${rarityGlow}`
          : 'bg-white/[0.02] border-white/5 opacity-30'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${earned ? badge.color : 'from-gray-700 to-gray-800'} flex items-center justify-center text-xl shadow-md`}>
        {earned ? badge.emoji : '🔒'}
      </div>
      <span className="text-[10px] font-semibold text-white/55 text-center leading-tight line-clamp-2">
        {badge.name}
      </span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// Stat Row
// ─────────────────────────────────────────────
function StatRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40">{icon}</div>
        <div>
          <p className="text-sm text-white/75 font-medium">{label}</p>
          {sub && <p className="text-[11px] text-white/25">{sub}</p>}
        </div>
      </div>
      <span className="text-base font-bold text-white font-display">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Profile Page
// ─────────────────────────────────────────────
export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const navigate = useNavigate();

  const [tab, setTab] = useState<'overview' | 'badges' | 'wardrobe' | 'history'>('overview');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const g = useGamificationStore();
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  
  const history = usePlayerStore((s) => s.history);
  const xp = computeXP(g);
  const rank = getRankForXP(xp);
  const xpProgress = getXPProgress(xp);
  const earnedBadges = g.earnedBadges;
  const listenHours = (g.listenMinutes / 60).toFixed(1);
  const topMood = Object.entries(g.moodSessionCounts).sort((a, b) => b[1] - a[1])[0];

  const circumference = 2 * Math.PI * 22;
  const dash = (xpProgress.percent / 100) * circumference;

  if (!user) {
    return (
      <div className="w-full min-h-full flex flex-col items-center justify-center px-6 pb-24 gap-8">
        <Helmet>
          <title>Profile | Pandoos</title>
        </Helmet>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-4xl">🐾</div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">Your Panda Profile</h1>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">Sign in to track your listening journey, earn badges, and build your Panda legacy.</p>
          </div>
        </div>
        <button onClick={() => signInWithGoogle()} className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 font-bold rounded-2xl text-sm hover:opacity-90 active:scale-95 transition-all w-full max-w-xs justify-center">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-4 h-4" />
          Continue with Google
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full pb-32 scroll-container">
      <Helmet>
        <title>{user.username}'s Profile | Pandoos</title>
        <meta name="description" content={`View ${user.username}'s profile, badges, and listening history on Pandoos.`} />
      </Helmet>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <BadgeDetailModal
            badge={selectedBadge}
            earned={earnedBadges.includes(selectedBadge.id)}
            onClose={() => setSelectedBadge(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Hero ── */}
      <div className="relative px-5 pt-6 pb-7">
        <div className={`absolute inset-0 bg-gradient-to-b ${rank.color} opacity-[0.07] pointer-events-none`} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${rank.color} p-[2px] shadow-lg shrink-0`}>
            <div className="w-full h-full rounded-[14px] bg-surface-base overflow-hidden">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">{rank.emoji}</div>
              }
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">{user.username}</h1>
            <p className={`text-xs font-semibold bg-gradient-to-r ${rank.color} bg-clip-text text-transparent`}>{rank.emoji} {rank.name}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{xp} XP · {earnedBadges.length} badges</p>
          </div>
        </div>

        {/* XP progress */}
        <div className="relative mt-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-white/30 uppercase tracking-wider">{rank.name}</span>
            {PANDA_RANKS[PANDA_RANKS.findIndex(r => r.name === rank.name) + 1] && (
              <span className="text-[11px] text-white/20">{PANDA_RANKS[PANDA_RANKS.findIndex(r => r.name === rank.name) + 1]!.name} →</span>
            )}
          </div>
          <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full bg-gradient-to-r ${rank.color}`}
              initial={{ width: 0 }} animate={{ width: `${xpProgress.percent}%` }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/20">{xpProgress.current} XP</span>
            <span className="text-[10px] text-white/20">{xpProgress.next} XP</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: g.streakDays, l: 'Day Streak', i: '🔥' },
            { v: listenHours + 'h', l: 'Listened', i: '🎧' },
            { v: `${earnedBadges.length}/${ALL_BADGES.length}`, l: 'Badges', i: '🏅' },
          ].map(({ v, l, i }) => (
            <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-3 py-3 flex flex-col items-center gap-1">
              <span className="text-base">{i}</span>
              <span className="text-lg font-display font-extrabold text-white leading-none">{v}</span>
              <span className="text-[10px] text-white/30 font-medium">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
          {(['overview', 'badges', 'wardrobe', 'history'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/55'}`}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="ov" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-1">
                <StatRow icon={<Clock size={14} />} label="Total Listening" value={`${listenHours}h`} sub="All time" />
                <StatRow icon={<Zap size={14} />} label="Best Streak" value={`${g.longestStreak}d`} sub="Personal best" />
                <StatRow icon={<Heart size={14} />} label="Liked Songs" value={g.likedSongs.length} />
                <StatRow icon={<TrendingUp size={14} />} label="Total XP" value={xp} sub="All activity" />
              </div>
              {topMood && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">Top Mood</p>
                    <p className="text-base font-bold text-white capitalize">{topMood[0]}</p>
                    <p className="text-[11px] text-white/30">{topMood[1]} sessions</p>
                  </div>
                  <span className="text-4xl opacity-80">{{ happy:'😊',sad:'😢',chill:'😎',energy:'⚡',romantic:'💕',angry:'😤',sleepy:'😴',workout:'💪' }[topMood[0]] ?? '🎵'}</span>
                </div>
              )}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                <p className="text-[11px] text-white/30 uppercase tracking-wider px-4 pt-4 pb-2">Rank Ladder</p>
                {PANDA_RANKS.map((r) => {
                  const isCurrent = r.name === rank.name;
                  const isPast = xp >= r.minXP;
                  return (
                    <div key={r.name} className={`flex items-center gap-3 px-4 py-3 border-t border-white/[0.04] ${isCurrent ? 'bg-white/[0.04]' : ''}`}>
                      <span className="text-base w-6 text-center">{r.emoji}</span>
                      <span className={`text-sm font-semibold flex-1 ${isPast ? 'text-white' : 'text-white/20'}`}>{r.name}</span>
                      <span className="text-[11px] text-white/20">{r.minXP} XP</span>
                      {isCurrent && <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">Now</span>}
                      {isPast && !isCurrent && <span className="text-emerald-500 text-xs">✓</span>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'badges' && (
            <motion.div key="bd" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs text-white/30 uppercase tracking-wider shrink-0">{earnedBadges.length}/{ALL_BADGES.length}</p>
                <div className="h-1 flex-1 bg-white/[0.07] rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${(earnedBadges.length / ALL_BADGES.length) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-white/25 mb-3">Tap any badge to view details & share</p>
              <div className="grid grid-cols-4 gap-2">
                {ALL_BADGES.map((badge, i) => (
                  <BadgeTile key={badge.id} id={badge.id} earned={earnedBadges.includes(badge.id)} index={i} onClick={() => setSelectedBadge(badge)} />
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'wardrobe' && (
            <motion.div key="wd" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Your Theme Wardrobe</p>
                <span className="text-xs text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full font-bold">New!</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed -mt-3 mb-4">Unlock premium themes by increasing your Panda Rank! Each theme completely overrides the UI colors.</p>
              
              <div className="grid grid-cols-1 gap-3 pb-8">
                {THEMES.map((theme, i) => {
                  const reqRank = PANDA_RANKS.find((r) => r.name === theme.requiredRank);
                  const isUnlocked = !reqRank || xp >= reqRank.minXP;
                  const isActive = activeTheme === theme.id;

                  return (
                    <motion.button
                      key={theme.id}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        if (isUnlocked) setActiveTheme(theme.id as any);
                      }}
                      className={`relative w-full rounded-3xl p-[2px] overflow-hidden transition-all duration-300 ${
                        isActive ? 'scale-100 shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'scale-[0.98] opacity-80 hover:opacity-100'
                      } ${!isUnlocked ? 'opacity-40 grayscale-[50%]' : 'cursor-pointer'}`}
                    >
                      {/* Gradient Border */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.previewGradient} ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                      
                      {/* Card Content */}
                      <div className="relative h-full w-full bg-[#0a0f0d] rounded-[22px] p-5 flex flex-col items-start text-left overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.previewGradient} opacity-20 blur-3xl rounded-full translate-x-10 -translate-y-10`} />
                        
                        <div className="flex items-center justify-between w-full mb-3 relative z-10">
                          <h3 className={`text-lg font-display font-bold ${isUnlocked ? 'text-white' : 'text-white/50'}`}>{theme.name}</h3>
                          {isActive ? (
                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center"><Check size={14} strokeWidth={3} /></div>
                          ) : !isUnlocked ? (
                            <div className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center text-xs">🔒</div>
                          ) : null}
                        </div>
                        
                        <p className="text-xs text-white/50 mb-4 relative z-10">{theme.description}</p>
                        
                        <div className="mt-auto relative z-10">
                          {!isUnlocked ? (
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                              <span className="text-[10px] text-white/30">Requires</span>
                              <span className="text-xs font-bold text-white/60">{theme.requiredRank}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${theme.previewGradient}`} />
                              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{isActive ? 'Equipped' : 'Unlocked'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="hi" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {history.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <Music size={28} className="text-white/10" />
                  <p className="text-sm text-white/25 text-center">No songs played yet.<br />Start your first session.</p>
                </div>
              ) : history.slice(0, 20).map((track, i) => (
                <motion.div key={`${track.id}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-xl px-2 transition-colors"
                >
                  <span className="text-xs text-white/15 w-4 text-right shrink-0">{i + 1}</span>
                  <img src={`https://img.youtube.com/vi/${track.videoId}/default.jpg`} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-[11px] text-white/30 truncate">{track.artist}</p>
                  </div>
                  <ChevronRight size={13} className="text-white/10 shrink-0" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign out + footer */}
      <div className="px-5 mt-8 flex flex-col gap-3">
        <button onClick={() => { signOut(); navigate('/login'); }}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-white/40 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/[0.05] text-sm font-semibold transition-all"
        >
          <LogOut size={15} />
          Sign Out
        </button>

        <div className="flex flex-col items-center gap-2 py-6 text-white/30 text-center px-4">
          <p className="text-[13px] italic font-medium text-white/40 leading-relaxed">
            "Life is short relax like a Panda and enjoy music"
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 py-4 text-white/12">
          <img src="/logo.png" alt="" className="w-6 h-6 opacity-30 object-contain grayscale" />
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/15">Pandoos Music · v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
