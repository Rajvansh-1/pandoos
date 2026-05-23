import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  isLoading?: boolean;
}

export function CreatePlaylistModal({ isOpen, onClose, onSubmit, isLoading }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const addToast = useToastStore((state) => state.addToast);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), description.trim());
      addToast('Playlist created successfully!', 'success');
      // reset forms on submit is handled externally or after successful close
    }
  };

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-surface-elevated border border-white/10 rounded-3xl p-6 z-[10000] shadow-2xl overflow-y-auto max-h-[90dvh]"
          >
            {/* Background ambient glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-primary/30 rounded-full blur-[60px] pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-2xl font-display font-bold text-white">New Playlist</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 bg-surface-base rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                  <Music2 size={48} className="text-text-muted opacity-50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 ml-1">Playlist Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="My Awesome Mix"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-base border border-white/10 focus:border-brand-primary rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1 ml-1">Description (Optional)</label>
                <textarea
                  placeholder="Give your playlist a catchy description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-base border border-white/10 focus:border-brand-primary rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className="mt-4 w-full bg-brand-primary text-white font-bold py-3.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  'Create Playlist'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
