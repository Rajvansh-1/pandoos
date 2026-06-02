import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useGamificationStore, ALL_BADGES, type Badge } from '@/stores/useGamificationStore';
import { Share2, Check } from 'lucide-react';

// ─── Confetti Particle ────────────────────────────────────────────────────────
function Particle({ x, y, emoji, delay, angle }: {
  x: number; y: number; emoji: string; delay: number; angle: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const distance = 120 + Math.random() * 160;
  return (
    <motion.div
      className="absolute text-xl pointer-events-none select-none z-10"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.4, 1, 0.6],
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance,
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      }}
      transition={{ duration: 1.4 + Math.random() * 0.6, delay, ease: [0.2, 0, 0.4, 1] }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Shockwave Ring ───────────────────────────────────────────────────────────
function ShockWave({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className={`absolute inset-0 rounded-full border-4 ${color}`}
      initial={{ scale: 0.5, opacity: 0.9 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 0.9, delay, ease: 'easeOut' }}
    />
  );
}

// ─── Rarity Config ────────────────────────────────────────────────────────────
const RARITY_CONFIG = {
  common: {
    label: 'COMMON',
    outerRing: 'from-slate-400 to-slate-500',
    glow: 'rgba(148,163,184,0.5)',
    shockColor: 'border-slate-400',
    bg: 'from-slate-900 via-slate-800 to-slate-900',
    pandas: ['🐼', '🎵', '✨', '⭐'],
    message: '"Great start! Every journey begins with one step 🐾"',
  },
  rare: {
    label: 'RARE',
    outerRing: 'from-blue-400 to-indigo-500',
    glow: 'rgba(99,102,241,0.7)',
    shockColor: 'border-blue-400',
    bg: 'from-blue-950 via-indigo-900 to-blue-950',
    pandas: ['🐼', '🌟', '💙', '🎵', '✨', '🌀'],
    message: '"Rare achievement unlocked! You\'re becoming a legend! 🌟"',
  },
  epic: {
    label: 'EPIC',
    outerRing: 'from-violet-400 to-fuchsia-500',
    glow: 'rgba(167,139,250,0.8)',
    shockColor: 'border-violet-400',
    bg: 'from-violet-950 via-purple-900 to-fuchsia-950',
    pandas: ['🐼', '💜', '🎊', '🌟', '✨', '🔮', '💫', '🎵'],
    message: '"EPIC!! You\'re on another level. The Panda Oracle is proud! 🔮"',
  },
  legendary: {
    label: 'LEGENDARY',
    outerRing: 'from-yellow-300 via-amber-400 to-orange-400',
    glow: 'rgba(251,191,36,0.9)',
    shockColor: 'border-amber-400',
    bg: 'from-amber-950 via-orange-900 to-yellow-950',
    pandas: ['🐼', '👑', '⚡', '🌟', '💛', '🏆', '✨', '🔥', '💫', '🎊', '💎', '🌠'],
    message: '"LEGENDARY. You are the ultimate Pandoos champion. BOW DOWN 👑"',
  },
};

// ─── Phase-based reveal sequence ──────────────────────────────────────────────
type Phase = 'idle' | 'charge' | 'burst' | 'reveal' | 'done';

function BadgeReveal({ badge, onDismiss }: { badge: Badge; onDismiss: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [copied, setCopied] = useState<string | null>(null);
  const glowControls = useAnimation();
  const config = RARITY_CONFIG[badge.rarity];

  // Build burst particles (360° spread from center)
  const particles = Array.from({ length: config.pandas.length * 2 }, (_, i) => ({
    id: i,
    x: 50,
    y: 50,
    emoji: config.pandas[i % config.pandas.length]!,
    delay: 0.02 * i,
    angle: (360 / (config.pandas.length * 2)) * i,
  }));

  // Auto-advance phases
  useEffect(() => {
    setPhase('idle');
    const t1 = setTimeout(() => setPhase('charge'), 100);
    const t2 = setTimeout(() => setPhase('burst'), 1100);
    const t3 = setTimeout(() => setPhase('reveal'), 1400);
    const t4 = setTimeout(() => setPhase('done'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [badge.id]);

  // Continuous glow pulse after reveal
  useEffect(() => {
    if (phase === 'done') {
      glowControls.start({
        opacity: [0.4, 0.9, 0.4],
        scale: [1, 1.15, 1],
        transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
      });
    }
  }, [phase, glowControls]);

  const shareText = `🐼 I just earned the "${badge.name}" ${badge.emoji} badge on Pandoos Music!\n\n"${badge.description}"\n\nJoin me → #PandoosMusic #WherePandasVibe`;
  const shareUrl = "https://pandoos.music"; // Fallback URL

  const copyMessage = (platform: string) => {
    navigator.clipboard.writeText(shareText);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleNativeShare = async () => {
    const fallbackCopy = () => {
      copyMessage('native');
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: `I earned: ${badge.name}!`, text: shareText, url: shareUrl });
      } catch (err) {
        fallbackCopy();
      }
    } else {
      fallbackCopy();
    }
  };

  const handleTwitterShare = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <>
      {/* ── Full-screen backdrop ── */}
      <motion.div
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* ── Modal container ── */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-hidden">

        {/* ── CHARGE phase: building energy bar ── */}
        <AnimatePresence>
          {phase === 'charge' && (
            <motion.div
              key="charge"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
            >
              {/* Charging panda */}
              <motion.div
                className="text-7xl"
                animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
              >
                🐼
              </motion.div>
              <motion.p
                className="text-white/70 text-sm font-bold tracking-widest uppercase"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                Unlocking Badge...
              </motion.p>
              {/* Charging bar */}
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${badge.color}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.85, ease: 'easeIn' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BURST phase: explosion ── */}
        <AnimatePresence>
          {phase === 'burst' && (
            <div key="burst" className="relative flex items-center justify-center w-48 h-48">
              {/* Multiple shockwaves */}
              <ShockWave delay={0}    color={config.shockColor} />
              <ShockWave delay={0.15} color={config.shockColor} />
              <ShockWave delay={0.30} color={config.shockColor} />
              {/* Burst particles fly out */}
              {particles.map((p) => (
                <Particle key={p.id} {...p} />
              ))}
              {/* Central flash */}
              <motion.div
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${badge.color}`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 2.5, 0], opacity: [1, 0.8, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* ── REVEAL & DONE phases: full card ── */}
        <AnimatePresence>
          {(phase === 'reveal' || phase === 'done') && (
            <motion.div
              key="card"
              className={`relative w-full max-w-sm rounded-3xl bg-gradient-to-b ${config.bg} border border-white/10 overflow-hidden`}
              initial={{ scale: 0.3, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            >
              {/* Top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${badge.color}`} />

              {/* Roaming background glow */}
              <motion.div
                className={`absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl bg-gradient-to-br ${badge.color} opacity-20 pointer-events-none`}
                animate={{ y: [0, 20, 0], opacity: [0.15, 0.35, 0.15] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              />

              <div className="flex flex-col items-center px-6 pt-8 pb-7 gap-5">

                {/* "NEW BADGE" pill */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${badge.color} text-black text-[11px] font-black tracking-[0.15em] uppercase shadow-lg`}
                >
                  🎉 Badge Unlocked!
                </motion.div>

                {/* Badge emoji with glow halo */}
                <motion.div
                  className="relative"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 160, delay: 0.05 }}
                >
                  {/* Animated glow halo */}
                  <motion.div
                    className={`absolute inset-0 rounded-full blur-2xl scale-150 bg-gradient-to-br ${badge.color}`}
                    animate={glowControls}
                    initial={{ opacity: 0.4, scale: 1.3 }}
                  />
                  {/* Ring */}
                  <div className={`w-32 h-32 rounded-full p-[3px] bg-gradient-to-br ${config.outerRing} shadow-2xl`}>
                    <div className={`w-full h-full rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center text-5xl shadow-inner`}>
                      <motion.span
                        animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.1, 1] }}
                        transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                      >
                        {badge.emoji}
                      </motion.span>
                    </div>
                  </div>
                </motion.div>

                {/* Badge name + rarity */}
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-display font-black text-white drop-shadow-lg mb-1">
                    {badge.name}
                  </h2>
                  <motion.span
                    className={`inline-block text-[11px] font-black tracking-[0.2em] px-3 py-1 rounded-full bg-gradient-to-r ${badge.color} text-black uppercase`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3, stiffness: 300 }}
                  >
                    ✦ {config.label} ✦
                  </motion.span>
                  <motion.p
                    className="text-sm text-white/65 leading-relaxed mt-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {badge.description}
                  </motion.p>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  className="flex flex-col w-full gap-3 mt-2"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex flex-col gap-3 w-full">
                    {/* Native Share */}
                    <motion.button
                      onClick={handleNativeShare}
                      whileTap={{ scale: 0.94 }}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r ${badge.color} text-white font-black text-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] drop-shadow-md active:scale-95 transition-opacity hover:opacity-90`}
                    >
                      <Share2 size={16} className="drop-shadow-sm" />
                      {copied === 'native' ? 'Copied ✓' : 'Share Badge 🎊'}
                    </motion.button>

                    {/* Platform-specific copy buttons */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => copyMessage('twitter')}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20 active:scale-95 transition-all group"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#1DA1F2] group-hover:scale-110 transition-transform"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#1DA1F2]">Twitter</span>
                          {copied === 'twitter' && <Check size={10} className="text-[#1DA1F2]" />}
                        </div>
                      </button>

                      <button
                        onClick={() => copyMessage('whatsapp')}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 active:scale-95 transition-all group"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#25D366] group-hover:scale-110 transition-transform"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.651.854 5.112 2.296 7.14l-1.574 5.766 5.882-1.545c1.93.1.921 1.096 11.458 12.016 1.442.274 2.85 2.146 3.639 5.385 1.544 12.031-1.545 12.031-8.211 12.031-14.86zM12.031 22.016c-2.316 0-4.464-.606-6.31-1.636l-.454-.27-3.87 1.016 1.036-3.774-.296-.47C1.121 14.996.536 13.567.536 12.031.536 5.681 5.681.536 12.031.536s11.495 5.145 11.495 11.495-5.145 11.495-11.495 11.495zm6.3-8.61c-.344-.173-2.043-1.009-2.359-1.125-.316-.116-.546-.173-.776.173-.23.346-.893 1.125-1.093 1.355-.2.23-.4.258-.744.085-2.285-1.144-3.69-2.585-4.669-4.32-.115-.205.011-.32.18-.49.155-.157.345-.403.518-.604.173-.2.23-.346.345-.576.115-.23.058-.432-.029-.604-.086-.173-.776-1.874-1.064-2.565-.28-.675-.563-.584-.776-.594-.2-.011-.43-.011-.66-.011-.23 0-.604.086-.92.432-.316.345-1.208 1.181-1.208 2.88s1.237 3.342 1.41 3.573c.172.23 2.436 3.719 5.897 5.18.824.347 1.467.554 1.968.709.827.261 1.58.224 2.176.136.671-.099 2.043-.836 2.33-1.643.288-.806.288-1.497.202-1.642-.087-.145-.317-.23-.661-.403z"/></svg>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#25D366]">WhatsApp</span>
                          {copied === 'whatsapp' && <Check size={10} className="text-[#25D366]" />}
                        </div>
                      </button>

                      <button
                        onClick={() => copyMessage('instagram')}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-tr from-[#f09433]/10 via-[#e6683c]/10 to-[#bc1888]/10 border border-[#bc1888]/30 hover:from-[#f09433]/20 hover:via-[#e6683c]/20 hover:to-[#bc1888]/20 active:scale-95 transition-all group"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#e1306c] group-hover:scale-110 transition-transform"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-[#e1306c]">Instagram</span>
                          {copied === 'instagram' && <Check size={10} className="text-[#e1306c]" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  <motion.button
                    onClick={onDismiss}
                    whileTap={{ scale: 0.94 }}
                    className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/10 transition-all"
                  >
                    Awesome 🐾
                  </motion.button>
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Main export — consumes pending reveal queue ──────────────────────────────
export function BadgeRevealModal() {
  const pendingReveal = useGamificationStore((s) => s.pendingReveal);
  const consumeReveal = useGamificationStore((s) => s.consumeReveal);

  const badgeId = pendingReveal[0];
  const badge = badgeId ? ALL_BADGES.find((b) => b.id === badgeId) : null;

  return (
    <AnimatePresence mode="wait">
      {badge && (
        <BadgeReveal key={badge.id} badge={badge} onDismiss={consumeReveal} />
      )}
    </AnimatePresence>
  );
}
