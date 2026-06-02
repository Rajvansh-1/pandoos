import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Clock, Zap, Music, TrendingUp, ChevronRight, Heart, X, Share2, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  useGamificationStore, computeXP, getRankForXP, getXPProgress,
  ALL_BADGES, PANDA_RANKS, type Badge,
} from '@/stores/useGamificationStore';
import { useThemeStore } from '@/stores/useThemeStore';
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

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I earned: ${badge.name} on Pandoos!`,
          text: shareMessages.general,
          url: PANDOOS_URL,
        });
      } catch (err) {
        copyMessage('general');
      }
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
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => copyMessage('twitter')}
                  className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20 active:scale-95 transition-all group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#1DA1F2] group-hover:scale-110 transition-transform"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-[#1DA1F2]">Twitter</span>
                    {copied === 'twitter' && <Check size={12} className="text-[#1DA1F2]" />}
                  </div>
                </button>

                <button
                  onClick={() => copyMessage('whatsapp')}
                  className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 active:scale-95 transition-all group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.651.854 5.112 2.296 7.14l-1.574 5.766 5.882-1.545c1.93.1.921 1.096 11.458 12.016 1.442.274 2.85 2.146 3.639 5.385 1.544 12.031-1.545 12.031-8.211 12.031-14.86zM12.031 22.016c-2.316 0-4.464-.606-6.31-1.636l-.454-.27-3.87 1.016 1.036-3.774-.296-.47C1.121 14.996.536 13.567.536 12.031.536 5.681 5.681.536 12.031.536s11.495 5.145 11.495 11.495-5.145 11.495-11.495 11.495zm6.3-8.61c-.344-.173-2.043-1.009-2.359-1.125-.316-.116-.546-.173-.776.173-.23.346-.893 1.125-1.093 1.355-.2.23-.4.258-.744.085-2.285-1.144-3.69-2.585-4.669-4.32-.115-.205.011-.32.18-.49.155-.157.345-.403.518-.604.173-.2.23-.346.345-.576.115-.23.058-.432-.029-.604-.086-.173-.776-1.874-1.064-2.565-.28-.675-.563-.584-.776-.594-.2-.011-.43-.011-.66-.011-.23 0-.604.086-.92.432-.316.345-1.208 1.181-1.208 2.88s1.237 3.342 1.41 3.573c.172.23 2.436 3.719 5.897 5.18.824.347 1.467.554 1.968.709.827.261 1.58.224 2.176.136.671-.099 2.043-.836 2.33-1.643.288-.806.288-1.497.202-1.642-.087-.145-.317-.23-.661-.403z"/></svg>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-[#25D366]">WhatsApp</span>
                    {copied === 'whatsapp' && <Check size={12} className="text-[#25D366]" />}
                  </div>
                </button>

                <button
                  onClick={() => copyMessage('instagram')}
                  className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-tr from-[#f09433]/10 via-[#e6683c]/10 to-[#bc1888]/10 border border-[#bc1888]/30 hover:from-[#f09433]/20 hover:via-[#e6683c]/20 hover:to-[#bc1888]/20 active:scale-95 transition-all group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#e1306c] group-hover:scale-110 transition-transform"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-[#e1306c]">Instagram</span>
                    {copied === 'instagram' && <Check size={12} className="text-[#e1306c]" />}
                  </div>
                </button>
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

  const rarityBg = {
    common: 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30',
    rare: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
    epic: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
    legendary: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40',
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
          ? `${rarityBg} ${rarityGlow}`
          : 'bg-white/[0.02] border-white/5 opacity-30'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${earned ? badge.color : 'from-gray-700 to-gray-800'} flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/20`}>
        {earned ? badge.emoji : '🔒'}
      </div>
      <span className={`text-[11px] font-bold text-center leading-tight line-clamp-2 mt-1 ${earned ? 'text-white drop-shadow-sm' : 'text-white/50'}`}>
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

  const [tab, setTab] = useState<'overview' | 'badges' | 'history'>('overview');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const g = useGamificationStore();
  const activeTheme = useThemeStore((s) => s.activeTheme);
  
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
    return <Navigate to="/login" replace />;
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
          {(['overview', 'badges', 'history'] as const).map((t) => (
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
