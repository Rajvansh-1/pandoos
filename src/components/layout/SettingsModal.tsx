import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Headphones, Wifi, Database, LogOut, Info, Settings2, Trash2, Heart } from 'lucide-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const settings = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear app cache? This will reset all local data except your downloaded songs.')) {
      localStorage.removeItem('pandoos-recent');
      localStorage.removeItem('pandoos-search-history');
      addToast('App cache cleared successfully', 'success');
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      if (signOut) {
        signOut();
      }
      onClose();
      addToast('Signed out successfully', 'info');
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end md:justify-center p-0 md:p-4 isolate pointer-events-none">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md z-[9999] pointer-events-auto"
        />
        
        {/* Modal Content */}
        <motion.div 
          initial={{ y: '100%', opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '100%', opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
          className="relative w-full max-w-lg max-h-[90vh] md:h-[700px] flex flex-col bg-[#0f1219] rounded-t-[2.5rem] md:rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[10000] pointer-events-auto overflow-hidden pb-safe"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-surface-elevated sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/20 rounded-xl text-brand-primary">
                <Settings2 size={24} />
              </div>
              <h2 className="text-xl font-display font-bold text-white">Settings</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto scroll-container p-6 space-y-8">
            
            {/* Playback Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-brand-primary mb-2">
                <Headphones size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Playback</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Audio Quality</h4>
                    <p className="text-xs text-white/50">Higher quality uses more data</p>
                  </div>
                  <select 
                    value={settings.audioQuality}
                    onChange={(e) => settings.setAudioQuality(e.target.value as 'high' | 'medium' | 'low')}
                    className="bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-primary transition-colors cursor-pointer"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Auto-Play</h4>
                    <p className="text-xs text-white/50">Keep playing similar tracks</p>
                  </div>
                  <button 
                    onClick={() => settings.setAutoPlay(!settings.autoPlay)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoPlay ? 'bg-brand-primary' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.autoPlay ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Gapless Playback</h4>
                    <p className="text-xs text-white/50">Remove silence between tracks</p>
                  </div>
                  <button 
                    onClick={() => settings.setGaplessPlayback(!settings.gaplessPlayback)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.gaplessPlayback ? 'bg-brand-primary' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.gaplessPlayback ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </section>

            {/* Data & Storage */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Wifi size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Data & Storage</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Data Saver</h4>
                    <p className="text-xs text-white/50">Reduce image & audio quality</p>
                  </div>
                  <button 
                    onClick={() => settings.setDataSaver(!settings.dataSaver)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.dataSaver ? 'bg-indigo-500' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.dataSaver ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <button 
                  onClick={handleClearCache}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-white/50 group-hover:text-white transition-colors" />
                    <span className="text-sm font-medium text-white/80 group-hover:text-white">Clear App Cache</span>
                  </div>
                  <Trash2 size={16} className="text-white/30 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            </section>

            {/* Account */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <LogOut size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Account</h3>
              </div>

              {user ? (
                <button 
                  onClick={handleSignOut}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              ) : (
                <p className="text-sm text-white/50">You are not signed in.</p>
              )}
            </section>

            {/* About */}
            <section className="pt-4 border-t border-white/5 text-center pb-8">
              <img src="/logo.png" alt="Pandoos Logo" className="w-12 h-12 mx-auto mb-3 opacity-80" />
              <h3 className="text-white font-display font-bold">Pandoos Music</h3>
              <p className="text-xs text-white/40 mt-1 mb-4">Version 2.1.0 • Built with Panda Love 🐼</p>
              
              <div className="flex items-center justify-center gap-4 text-xs text-brand-primary mt-2">
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/legal');
                  }} 
                  className="hover:underline transition-colors"
                >
                  Terms of Service
                </button>
                <span className="text-white/20">•</span>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/legal');
                  }} 
                  className="hover:underline transition-colors"
                >
                  Privacy Policy
                </button>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
