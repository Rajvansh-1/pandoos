import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] flex flex-col items-center gap-2 p-4 pointer-events-none mt-safe">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex items-center gap-3 bg-surface-elevated border border-white/10 shadow-2xl rounded-2xl py-3 px-4 backdrop-blur-xl"
          >
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-brand-primary" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-400" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-400" />}
            
            <p className="text-white font-medium text-sm pr-2">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
