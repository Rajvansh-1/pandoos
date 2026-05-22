import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Music2, Sparkles, Zap } from 'lucide-react';

/* ─── Floating Bamboo Leaf ────────────────────────────────────── */
interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  drift: number;
}

function BambooLeaf({ leaf }: { leaf: Leaf }) {
  return (
    <motion.div
      className="absolute top-0 pointer-events-none"
      style={{ left: `${leaf.x}%`, zIndex: 1 }}
      initial={{ y: -30, opacity: 0, rotate: -20 }}
      animate={{
        y: ['0vh', '110vh'],
        x: [0, leaf.drift],
        rotate: [-20, 40, -20],
        opacity: [0, leaf.opacity, leaf.opacity, 0],
      }}
      transition={{
        duration: leaf.duration,
        delay: leaf.delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg width={leaf.size} height={leaf.size * 1.8} viewBox="0 0 14 24" fill="none">
        {/* Bamboo leaf shape */}
        <path
          d="M7 0 C14 6 16 14 7 24 C-2 14 0 6 7 0Z"
          fill="rgba(134,239,172,0.55)"
          stroke="rgba(74,222,128,0.3)"
          strokeWidth="0.5"
        />
        <path d="M7 0 L7 24" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
}

function generateLeaves(): Leaf[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 9,
    duration: 8 + Math.random() * 7,
    size: 8 + Math.random() * 10,
    opacity: 0.35 + Math.random() * 0.4,
    drift: (Math.random() - 0.5) * 90,
  }));
}

/* ─── Floating Orb (bokeh) ────────────────────────────────────── */
function BokeOrb({ x, y, size, color, delay }: {
  x: number; y: number; size: number; color: string; delay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: color,
        filter: `blur(${size / 2}px)`,
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

/* ─── Sound Wave Bars ─────────────────────────────────────────── */
function SoundWave() {
  const heights = [0.5, 0.9, 0.65, 1.0, 0.75, 0.55, 0.85, 0.45, 0.7, 0.6];
  return (
    <div className="flex items-end justify-center gap-[3px]" style={{ height: '20px' }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          style={{
            width: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(to top, #4ade80, #86efac)',
            height: `${h * 100}%`,
          }}
          animate={{ scaleY: [h, h * 0.25 + 0.1, h * 0.7, h] }}
          transition={{
            duration: 0.7 + (i % 3) * 0.2,
            delay: i * 0.07,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Features ────────────────────────────────────────────────── */
const FEATURES = [
  { text: 'AI Mood Engine', icon: <Zap size={12} /> },
  { text: 'High-Fidelity Audio', icon: <Music2 size={12} /> },
  { text: 'Your Personal Oracle', icon: <Sparkles size={12} /> },
];

/* ─── Main Page ───────────────────────────────────────────────── */
export function LoginPage() {
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [leaves] = useState<Leaf[]>(generateLeaves);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setFeatureIndex(p => (p + 1) % FEATURES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#080d08' }}
    >
      <Helmet>
        <title>Login | Pandoos</title>
        <meta name="description" content="Sign in to Pandoos — mood-adaptive music powered by your inner panda." />
      </Helmet>

      {/* ── Background gradients ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 15% 20%, rgba(74,222,128,0.10) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 85% 75%, rgba(134,239,172,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 50% 100%, rgba(21,128,61,0.12) 0%, transparent 70%),
            #080d08
          `,
        }}
      />

      {/* ── Subtle grid lines ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Bokeh orbs ── */}
      <BokeOrb x={10} y={15} size={180} color="radial-gradient(circle, rgba(74,222,128,0.18), transparent 70%)" delay={0} />
      <BokeOrb x={75} y={65} size={220} color="radial-gradient(circle, rgba(134,239,172,0.12), transparent 70%)" delay={2} />
      <BokeOrb x={50} y={-5} size={160} color="radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)" delay={1.5} />
      <BokeOrb x={85} y={10} size={120} color="radial-gradient(circle, rgba(74,222,128,0.1), transparent 70%)" delay={3} />

      {/* ── Bamboo silhouettes (left + right edges) ── */}
      {/* Left bamboo */}
      <div className="absolute left-0 bottom-0 z-0 pointer-events-none opacity-20 select-none">
        <svg width="120" height="420" viewBox="0 0 120 420" fill="none">
          {/* Stalk 1 */}
          <rect x="18" y="0" width="10" height="420" rx="5" fill="#4ade80" opacity="0.7" />
          <rect x="18" y="60" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="130" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="210" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="290" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="360" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          {/* Leaves */}
          <path d="M28 70 Q60 50 70 80 Q45 75 28 76Z" fill="#4ade80" opacity="0.8" />
          <path d="M28 200 Q-10 185 -5 215 Q10 205 28 206Z" fill="#4ade80" opacity="0.7" />
          {/* Stalk 2 */}
          <rect x="55" y="80" width="8" height="340" rx="4" fill="#4ade80" opacity="0.5" />
          <rect x="55" y="150" width="8" height="5" rx="2.5" fill="#86efac" opacity="0.8" />
          <rect x="55" y="240" width="8" height="5" rx="2.5" fill="#86efac" opacity="0.8" />
          <path d="M63 160 Q90 145 95 170 Q75 165 63 166Z" fill="#4ade80" opacity="0.7" />
        </svg>
      </div>
      {/* Right bamboo */}
      <div className="absolute right-0 bottom-0 z-0 pointer-events-none opacity-20 select-none" style={{ transform: 'scaleX(-1)' }}>
        <svg width="120" height="420" viewBox="0 0 120 420" fill="none">
          <rect x="18" y="0" width="10" height="420" rx="5" fill="#4ade80" opacity="0.7" />
          <rect x="18" y="80" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="170" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="260" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <rect x="18" y="340" width="10" height="6" rx="3" fill="#86efac" opacity="0.9" />
          <path d="M28 90 Q60 70 70 100 Q45 95 28 96Z" fill="#4ade80" opacity="0.8" />
          <path d="M28 250 Q-10 235 -5 265 Q10 255 28 256Z" fill="#4ade80" opacity="0.7" />
          <rect x="60" y="40" width="8" height="380" rx="4" fill="#4ade80" opacity="0.5" />
          <rect x="60" y="120" width="8" height="5" rx="2.5" fill="#86efac" opacity="0.8" />
          <rect x="60" y="220" width="8" height="5" rx="2.5" fill="#86efac" opacity="0.8" />
          <path d="M68 130 Q95 115 100 140 Q80 135 68 136Z" fill="#4ade80" opacity="0.7" />
        </svg>
      </div>

      {/* ── Falling bamboo leaves ── */}
      {leaves.map((leaf) => <BambooLeaf key={leaf.id} leaf={leaf} />)}

      {/* ── Stars (tiny white dots) ── */}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none z-0"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 65}%`,
            width: `${0.8 + Math.random() * 1.2}px`,
            height: `${0.8 + Math.random() * 1.2}px`,
            opacity: 0.15 + Math.random() * 0.35,
          }}
          animate={{ opacity: [0.15, 0.55, 0.15] }}
          transition={{ duration: 2.5 + Math.random() * 3, delay: Math.random() * 4, repeat: Infinity }}
        />
      ))}

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, type: 'spring', bounce: 0.3 }}
        className="relative z-10 flex flex-col items-center w-full max-w-[390px] px-5"
      >
        <div
          className="w-full flex flex-col items-center text-center relative overflow-hidden"
          style={{
            borderRadius: '28px',
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(8,13,8,0.92) 60%, rgba(74,222,128,0.04) 100%)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)',
            border: '1px solid rgba(74,222,128,0.18)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.04) inset,
              0 24px 64px rgba(0,0,0,0.75),
              0 0 50px rgba(74,222,128,0.07)
            `,
            padding: '36px 32px 28px',
          }}
        >
          {/* Top-left & bottom-right corner accents */}
          <div className="absolute top-0 left-0 w-10 h-10 pointer-events-none" style={{ borderTop: '2px solid rgba(74,222,128,0.45)', borderLeft: '2px solid rgba(74,222,128,0.45)', borderRadius: '28px 0 0 0' }} />
          <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none" style={{ borderBottom: '2px solid rgba(74,222,128,0.3)', borderRight: '2px solid rgba(74,222,128,0.3)', borderRadius: '0 0 28px 0' }} />

          {/* Animated border glow pulse */}
          <motion.div
            className="absolute -inset-[1px] pointer-events-none"
            style={{ borderRadius: '28px', background: 'linear-gradient(135deg, rgba(74,222,128,0.12) 0%, transparent 50%, rgba(134,239,172,0.08) 100%)' }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* ── Mascot Section ── */}
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="relative mb-4"
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.2) 0%, transparent 70%)', filter: 'blur(14px)' }}
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Mascot container */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: '136px',
                height: '136px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(8,13,8,0.9) 100%)',
                border: '2px solid rgba(74,222,128,0.22)',
                boxShadow: '0 0 0 6px rgba(74,222,128,0.05), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <PandaMascot
                size={112}
                emotion={isAuthenticating ? 'focus' : isHovering ? 'energy' : 'neutral'}
              />
            </div>

            {/* Feature badge below mascot */}
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 overflow-hidden"
              style={{
                minWidth: '160px',
                height: '26px',
                borderRadius: '99px',
                background: 'rgba(8,13,8,0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(74,222,128,0.25)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={featureIndex}
                  initial={{ y: 22, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -22, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex items-center justify-center gap-1.5 h-full px-3"
                  style={{ color: '#86efac', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}
                >
                  <span style={{ color: '#4ade80' }}>{FEATURES[featureIndex].icon}</span>
                  {FEATURES[featureIndex].text}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Brand Name ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 mb-1"
          >
            <h1
              style={{
                fontSize: '44px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                background: 'linear-gradient(135deg, #ffffff 0%, #bbf7d0 50%, #4ade80 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 24px rgba(74,222,128,0.3))',
              }}
            >
              Pandoos
            </h1>
          </motion.div>

          {/* Sound wave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-3"
          >
            <SoundWave />
          </motion.div>

          {/* ── Tagline ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38 }}
            style={{
              fontSize: '13px',
              color: 'rgba(187,247,208,0.55)',
              fontStyle: 'italic',
              marginBottom: '24px',
              lineHeight: 1.65,
              maxWidth: '260px',
            }}
          >
            Life is short — relax like a Panda<br />and let the music flow.
          </motion.p>

          {/* ── Divider ── */}
          <div className="w-full flex items-center gap-3 mb-5">
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.2))' }} />
            <span style={{ fontSize: '10px', color: 'rgba(74,222,128,0.4)', letterSpacing: '0.2em', fontWeight: 700 }}>SIGN IN</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(74,222,128,0.2), transparent)' }} />
          </div>

          {/* ── Google Login Button ── */}
          <motion.button
            id="login-google-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            whileHover={isAuthenticating ? {} : { scale: 1.035, y: -1 }}
            whileTap={isAuthenticating ? {} : { scale: 0.975 }}
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="relative w-full flex items-center justify-center gap-3 overflow-hidden"
            style={{
              height: '54px',
              borderRadius: '16px',
              background: isAuthenticating
                ? 'rgba(74,222,128,0.05)'
                : 'linear-gradient(135deg, rgba(74,222,128,0.18) 0%, rgba(134,239,172,0.08) 100%)',
              border: '1px solid rgba(74,222,128,0.3)',
              color: '#bbf7d0',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 24px rgba(74,222,128,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
              transition: 'box-shadow 0.25s ease, background 0.25s ease',
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              animate={{ x: ['-160%', '260%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                width: '50%',
              }}
            />

            {isAuthenticating ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" style={{ color: '#4ade80' }} />
                <span style={{ color: '#86efac' }}>Connecting...</span>
              </motion.div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="relative z-10" style={{ width: '20px', height: '20px', flexShrink: 0 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="relative z-10">Continue with Google</span>
              </>
            )}
          </motion.button>

          {/* ── Panda paw prints decoration ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mt-4 mb-1"
          >
            {['🐾', '🐾', '🐾'].map((p, i) => (
              <motion.span
                key={i}
                style={{ fontSize: '12px', opacity: 0.25 + i * 0.1 }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {p}
              </motion.span>
            ))}
          </motion.div>

          {/* ── Skip button ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <button
              type="button"
              id="login-skip-btn"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              disabled={isAuthenticating}
              className="group"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(134,239,172,0.3)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                background: 'none',
                border: 'none',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                padding: '6px 14px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'rgba(134,239,172,0.65)'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'rgba(134,239,172,0.3)'; }}
            >
              Skip for now →
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.12)', marginTop: '14px', letterSpacing: '0.06em' }}
        >
          © 2025 Pandoos · Made with 🐼 &amp; music
        </motion.p>
      </motion.div>
    </div>
  );
}
