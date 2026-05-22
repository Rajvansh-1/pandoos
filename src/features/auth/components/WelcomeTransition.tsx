import React from 'react';
import { motion } from 'framer-motion';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { Sparkles, Heart } from 'lucide-react';

interface WelcomeTransitionProps {
  username: string;
}

export function WelcomeTransition({ username }: WelcomeTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#080d08]"
    >
      {/* ── Background celebratory gradients ── */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          background: `
            radial-gradient(circle at 50% 40%, rgba(74,222,128,0.2) 0%, transparent 50%),
            radial-gradient(circle at 30% 60%, rgba(167,139,250,0.15) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(244,114,182,0.15) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating Sparkles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute z-0 pointer-events-none"
          initial={{ 
            opacity: 0, 
            y: Math.random() * 100 + 50, 
            x: (Math.random() - 0.5) * 300,
            scale: 0
          }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: -150 - Math.random() * 100,
            scale: [0, 1.5, 0.5],
            rotate: Math.random() * 360
          }}
          transition={{ 
            duration: 2 + Math.random() * 1.5, 
            delay: Math.random() * 0.5,
            ease: 'easeOut' 
          }}
        >
          <Sparkles size={16 + Math.random() * 16} color={i % 2 === 0 ? '#4ade80' : '#f472b6'} opacity={0.6} />
        </motion.div>
      ))}

      {/* ── Mascot Container ── */}
      <motion.div
        initial={{ y: 50, scale: 0.8, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.9, delay: 0.2 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Glow behind panda */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.4) 0%, transparent 70%)', filter: 'blur(20px)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        <div 
          className="relative flex items-center justify-center bg-black/40 backdrop-blur-md border border-[#4ade80]/30"
          style={{ width: '160px', height: '160px', borderRadius: '50%', boxShadow: '0 0 40px rgba(74,222,128,0.15)' }}
        >
          <PandaMascot size={130} emotion="happy" />
        </div>

        {/* Heart icon popping up */}
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 0 }}
          animate={{ scale: 1.5, opacity: [0, 1, 0], y: -40 }}
          transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
          className="absolute -top-6 right-0 text-pink-400"
        >
          <Heart size={24} fill="currentColor" />
        </motion.div>
      </motion.div>

      {/* ── Text Greetings ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative z-10 mt-8 text-center"
      >
        <h2 
          style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            background: 'linear-gradient(to right, #ffffff, #bbf7d0, #4ade80)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            marginBottom: '8px'
          }}
        >
          Welcome back, {username}!
        </h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          style={{ fontSize: '15px', color: 'rgba(187,247,208,0.7)', fontWeight: 500 }}
        >
          Setting up your vibes...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
