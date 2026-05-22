import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PandaMascot } from '@/features/panda/components/PandaMascot';
import { Home, Moon } from 'lucide-react';

export function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Super clean subtle radial background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary/5 via-surface-base to-surface-base" />

      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 flex flex-col items-center max-w-xl"
      >
        <motion.div 
          animate={{ y: [0, -10, 0] }} 
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative mb-6"
        >
          {/* Subtle glow behind the panda */}
          <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full" />
          <PandaMascot size={200} emotion="sleepy" />
        </motion.div>
        
        <div className="inline-flex items-center justify-center space-x-4 mb-4">
          <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter text-white drop-shadow-lg">
            404
          </h1>
        </div>
        
        <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-6">
          The server panda fell asleep.
        </h2>
        
        <p className="text-white/60 mb-12 text-lg leading-relaxed font-light">
          We looked everywhere, but this page doesn't exist. Our lead engineer (the panda) was supposed to build it, but took a nap instead.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            <Home size={20} className="transition-transform group-hover:-translate-y-1" />
            Wake Panda & Go Home
          </button>
          
          <button
            onClick={() => navigate('/?mood=chill')}
            className="group flex items-center justify-center gap-3 bg-surface-elevated hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <Moon size={20} className="text-blue-300 transition-transform group-hover:-rotate-12" />
            Let him sleep (Play Lo-Fi)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
