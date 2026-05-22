import React from 'react';
import { motion } from 'framer-motion';
import { usePandaState } from '../hooks/usePandaState';
import { cn } from '@/utils/cn';

interface PandaMascotProps {
  className?: string;
  size?: number;
  emotion?: string; // 'neutral', 'chill', 'energy', 'focus', 'romantic', 'workout', 'happy', 'heartbroken', 'latenight', 'sleepy', 'sufi', 'desi', 'bollywood', 'devotional'
}

export function PandaMascot({ className, size = 120, emotion = 'neutral' }: PandaMascotProps) {
  const state = usePandaState();

  const getMouthPath = () => {
    if (emotion === 'heartbroken' || emotion === 'sad') return "M80 145 Q100 130 120 145"; // Frown
    if (emotion === 'angry' || emotion === 'workout') return "M85 145 Q100 135 115 145"; // Angry mouth
    if (emotion === 'energy' || emotion === 'happy' || emotion === 'bollywood' || emotion === 'romantic') return "M80 135 Q100 165 120 135"; // Big smile
    if (emotion === 'chill' || emotion === 'latenight' || emotion === 'desi') return "M85 140 Q100 145 115 140"; // Smirk
    if (emotion === 'sufi' || emotion === 'devotional') return "M85 145 Q100 150 115 145"; // Soft peaceful smile
    if (emotion === 'sleepy') return "M90 140 Q100 145 110 140"; // Relaxed tiny mouth
    if (emotion === 'focus') return "M85 142 Q100 143 115 142"; // Straight mouth
    if (state === 'listening' || state === 'nodding') return "M100 135 Q85 155 75 140 M100 135 Q115 155 125 140";
    return "M100 135 Q90 150 80 145 M100 135 Q110 150 120 145";
  };

  const showGlasses = () => {
    // Only standard black sunglasses
    if (['chill', 'desi'].includes(emotion)) return true;
    if (state === 'nodding' && !['focus', 'latenight', 'sleepy', 'sufi', 'devotional', 'heartbroken', 'romantic'].includes(emotion)) return true;
    return false;
  };

  return (
    <div 
      className={cn("relative flex items-center justify-center pointer-events-none drop-shadow-2xl", className)}
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        animate={state === 'nodding' ? { y: [0, -4, 0] } : { y: 0 }}
        transition={state === 'nodding' ? { repeat: Infinity, duration: 0.5, ease: "easeInOut" } : { duration: 0.5 }}
      >
        {/* ---- Head Base ---- */}
        <motion.circle 
          cx="45" cy="55" r="22" 
          fill="#111" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
          animate={state === 'nodding' ? { y: [0, 2, 0] } : { y: 0 }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        />
        <motion.circle 
          cx="155" cy="55" r="22" 
          fill="#111" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
          animate={state === 'nodding' ? { y: [0, 2, 0] } : { y: 0 }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        />

        <path d="M100 25 C145 25 180 55 180 100 C180 145 145 175 100 175 C55 175 20 145 20 100 C20 55 55 25 100 25 Z" fill="#F8F9FA" stroke="#E2E8F0" strokeWidth="2" />
        
        {/* Blush */}
        <ellipse cx="50" cy="120" rx="12" ry="8" fill="#FFB7B2" opacity="0.4" />
        <ellipse cx="150" cy="120" rx="12" ry="8" fill="#FFB7B2" opacity="0.4" />

        {/* Eye Patches */}
        <path d="M45 80 C55 65 85 75 80 105 C75 135 40 120 45 80 Z" fill="#111" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <path d="M155 80 C145 65 115 75 120 105 C125 135 160 120 155 80 Z" fill="#111" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Pupils */}
        {emotion !== 'sleepy' && emotion !== 'romantic' && emotion !== 'sufi' && emotion !== 'devotional' && emotion !== 'bollywood' && emotion !== 'energy' && (
          <motion.g
            animate={
              state === 'loading' ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } :
              (emotion === 'chill' || emotion === 'latenight') ? { scaleY: 0.5 } : 
              (emotion === 'angry' || emotion === 'workout') ? { scaleY: 0.8, scaleX: 1.1 } : 
              state === 'idle' ? { scaleY: [1, 0.1, 1] } : 
              { scaleY: 1 }
            }
            transition={
              state === 'loading' ? { repeat: Infinity, duration: 1 } :
              state === 'idle' ? { repeat: Infinity, repeatDelay: 4, duration: 0.2 } :
              {}
            }
          >
            <circle cx="65" cy="95" r="6" fill="#FFF" />
            <circle cx="68" cy="92" r="2" fill="#FFF" opacity="0.8" />
            <circle cx="135" cy="95" r="6" fill="#FFF" />
            <circle cx="132" cy="92" r="2" fill="#FFF" opacity="0.8" />
          </motion.g>
        )}

        {/* Romantic Heart Eyes */}
        {emotion === 'romantic' && (
          <motion.g fill="#ef4444" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ transformOrigin: "100px 95px" }}>
            <path d="M 65 105 C 65 105 53 95 53 87 A 6 6 0 0 1 65 80 A 6 6 0 0 1 77 87 C 77 95 65 105 65 105 Z" />
            <path d="M 135 105 C 135 105 123 95 123 87 A 6 6 0 0 1 135 80 A 6 6 0 0 1 147 87 C 147 95 135 105 135 105 Z" />
          </motion.g>
        )}

        {/* Bollywood Starry Eyes */}
        {emotion === 'bollywood' && (
          <>
            <motion.polygon 
              fill="#facc15" 
              points="65,85 68,92 75,95 68,98 65,105 62,98 55,95 62,92" 
              animate={{ rotate: [0, 180, 360], scale: [1, 1.3, 1] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              style={{ transformOrigin: "65px 95px" }}
            />
            <motion.polygon 
              fill="#facc15" 
              points="135,85 138,92 145,95 138,98 135,105 132,98 125,95 132,92" 
              animate={{ rotate: [0, 180, 360], scale: [1, 1.3, 1] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              style={{ transformOrigin: "135px 95px" }}
            />
          </>
        )}

        {/* Sleepy / Sufi / Devotional Eyes (Closed) */}
        {(emotion === 'sleepy' || emotion === 'sufi' || emotion === 'devotional') && (
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6">
            <path d="M55 95 Q 65 105 75 95" />
            <path d="M125 95 Q 135 105 145 95" />
          </g>
        )}

        {/* Angry Eyebrows */}
        {(emotion === 'angry' || emotion === 'workout') && (
          <motion.g stroke="#111" strokeWidth="5" strokeLinecap="round">
            <path d="M40 70 L75 85" />
            <path d="M160 70 L125 85" />
          </motion.g>
        )}

        {/* Energy Lightning Eyes */}
        {emotion === 'energy' && (
          <motion.g fill="#facc15" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            <polygon points="65,80 72,80 62,95 68,95 58,110 65,90 58,90" />
            <polygon points="135,80 142,80 132,95 138,95 128,110 135,90 128,90" />
          </motion.g>
        )}

        {/* Heartbroken Tears */}
        {(emotion === 'heartbroken' || emotion === 'sad') && (
          <motion.g fill="#60a5fa">
            <motion.path d="M65 110 Q70 125 65 130 Q60 125 65 110" animate={{ y: [0, 15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
            <motion.path d="M135 110 Q140 125 135 130 Q130 125 135 110" animate={{ y: [0, 15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.7 }} />
          </motion.g>
        )}

        {/* Sleepy Zzz */}
        {emotion === 'sleepy' && (
          <motion.g fill="#93c5fd" fontSize="16" fontWeight="bold">
            <motion.text x="140" y="50" animate={{ y: [0, -10, -20], x: [0, 5, 10], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }}>Z</motion.text>
            <motion.text x="155" y="35" animate={{ y: [0, -10, -20], x: [0, 5, 10], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} fontSize="20">Z</motion.text>
            <motion.text x="175" y="15" animate={{ y: [0, -10, -20], x: [0, 5, 10], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }} fontSize="24">Z</motion.text>
          </motion.g>
        )}

        {/* Desi Gold Chain */}
        {emotion === 'desi' && (
          <motion.g stroke="#facc15" strokeWidth="4" strokeLinecap="round" fill="none" animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            <path d="M60 160 Q100 190 140 160" />
            <circle cx="100" cy="175" r="8" fill="#facc15" stroke="none" />
            <text x="96" y="180" fill="#000" fontSize="10" fontWeight="bold">D</text>
          </motion.g>
        )}

        {/* Desi Backward Cap */}
        {emotion === 'desi' && (
          <g>
            <path d="M30 40 C30 10 170 10 170 40 L170 50 C170 50 100 60 30 50 Z" fill="#ef4444" />
            <path d="M170 45 C190 45 190 60 170 60 L140 60 Z" fill="#b91c1c" />
          </g>
        )}

        {/* Workout Headband */}
        {emotion === 'workout' && (
          <motion.g initial={{ y: -10 }} animate={{ y: 0 }}>
            <path d="M25 65 Q100 45 175 65 L170 50 Q100 30 30 50 Z" fill="#ef4444" />
          </motion.g>
        )}

        {/* Sufi Cap */}
        {emotion === 'sufi' && (
          <motion.path 
            d="M60 45 Q100 5 140 45 L135 55 Q100 45 65 55 Z" 
            fill="#166534" 
            stroke="#facc15" strokeWidth="2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          />
        )}

        {/* Devotional Tilak */}
        {emotion === 'devotional' && (
          <motion.path 
            d="M95 45 Q100 60 105 45 Z M100 65 A3 3 0 1 0 100 71 A3 3 0 1 0 100 65" 
            fill="#ea580c" 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: "100px 55px" }}
          />
        )}

        {/* Standard Sunglasses */}
        <motion.g
          initial={{ y: -50, opacity: 0 }}
          animate={showGlasses() ? { y: 0, opacity: 1 } : { y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <path d="M30 85 L170 85 L160 115 C155 125 140 125 135 115 L100 95 L65 115 C60 125 45 125 40 115 Z" fill="#0f172a" />
          <path d="M35 85 L85 85 L75 110 C70 115 50 115 45 110 Z" fill="url(#glass-gradient)" opacity="0.5" />
          <path d="M115 85 L165 85 L155 110 C150 115 130 115 125 110 Z" fill="url(#glass-gradient)" opacity="0.5" />
          <path d="M85 85 L115 85" stroke="#0f172a" strokeWidth="4" />
        </motion.g>

        {/* LateNight Vaporwave Glasses */}
        {emotion === 'latenight' && (
          <motion.g initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
            <path d="M30 85 L170 85 L160 115 C155 125 140 125 135 115 L100 95 L65 115 C60 125 45 125 40 115 Z" fill="url(#vaporwave-glass)" stroke="#f472b6" strokeWidth="2" />
            <path d="M85 85 L115 85" stroke="#22d3ee" strokeWidth="4" />
            {/* Retro reflections */}
            <path d="M45 95 L75 95" stroke="#fff" strokeWidth="2" opacity="0.8" />
            <path d="M125 95 L155 95" stroke="#fff" strokeWidth="2" opacity="0.8" />
          </motion.g>
        )}

        {/* Focus Nerd Glasses */}
        {emotion === 'focus' && (
          <motion.g initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
            <circle cx="65" cy="95" r="22" fill="url(#glass-gradient)" stroke="#111" strokeWidth="5" />
            <circle cx="135" cy="95" r="22" fill="url(#glass-gradient)" stroke="#111" strokeWidth="5" />
            <path d="M87 95 L113 95" stroke="#111" strokeWidth="5" />
            <path d="M20 95 L43 95" stroke="#111" strokeWidth="4" />
            <path d="M157 95 L180 95" stroke="#111" strokeWidth="4" />
          </motion.g>
        )}

        {/* Nose & Mouth */}
        <path d="M90 125 Q100 120 110 125 Q105 135 100 135 Q95 135 90 125 Z" fill="#222" />
        <motion.path 
          d={getMouthPath()} 
          stroke="#222" strokeWidth="3" strokeLinecap="round" fill={(emotion === 'energy' || emotion === 'happy' || emotion === 'bollywood' || emotion === 'romantic') ? '#ff7b72' : 'none'}
          animate={{ d: getMouthPath() }}
          transition={{ duration: 0.3 }}
        />

        {/* Chill Bamboo Leaf */}
        {emotion === 'chill' && (
          <motion.path 
            d="M100 140 Q130 160 145 135 Q135 140 100 140" 
            fill="#4ade80" stroke="#166534" strokeWidth="2"
            animate={{ rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ transformOrigin: "100px 140px" }}
          />
        )}

        <defs>
          <linearGradient id="glass-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vaporwave-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
