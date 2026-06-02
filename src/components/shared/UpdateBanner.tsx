import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles, RefreshCw } from 'lucide-react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready';

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only works inside the packaged Electron app
    const api = (window as any).electronAPI;
    if (!api) return;

    // listen for update-available signal from the main process
    api.onUpdateAvailable?.(() => {
      setState('available');
    });

    api.onUpdateDownloading?.(() => {
      setState('downloading');
    });

    api.onUpdateReady?.(() => {
      setState('ready');
    });

    return () => {
      api.removeUpdateListeners?.();
    };
  }, []);

  const show = !dismissed && state !== 'idle';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -56 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -56 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-2 pointer-events-none"
        >
          <div
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-2xl"
            style={{
              background:
                state === 'ready'
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(16,185,129,0.18) 100%)'
                  : 'linear-gradient(135deg, rgba(156,106,222,0.28) 0%, rgba(255,107,157,0.18) 100%)',
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  state === 'ready'
                    ? 'rgba(34,197,94,0.3)'
                    : 'rgba(156,106,222,0.35)',
              }}
            >
              {state === 'downloading' ? (
                <RefreshCw size={16} className="text-white animate-spin" />
              ) : state === 'ready' ? (
                <Sparkles size={16} className="text-green-300" />
              ) : (
                <Download size={16} className="text-purple-200" />
              )}
            </div>

            {/* Text */}
            <div className="min-w-0">
              {state === 'available' && (
                <>
                  <p className="text-sm font-bold text-white leading-tight">
                    🐼 Pandoos update available!
                  </p>
                  <p className="text-xs text-white/60 leading-tight">
                    Downloading in the background…
                  </p>
                </>
              )}
              {state === 'downloading' && (
                <>
                  <p className="text-sm font-bold text-white leading-tight">
                    Downloading update…
                  </p>
                  <p className="text-xs text-white/60 leading-tight">
                    This will only take a moment.
                  </p>
                </>
              )}
              {state === 'ready' && (
                <>
                  <p className="text-sm font-bold text-white leading-tight">
                    ✨ Update ready to install!
                  </p>
                  <p className="text-xs text-white/60 leading-tight">
                    Restart Pandoos to apply the update.
                  </p>
                </>
              )}
            </div>

            {/* CTA */}
            {state === 'ready' && (
              <button
                onClick={() => (window as any).electronAPI?.restartAndInstall?.()}
                className="ml-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-green-500 hover:bg-green-400 text-black transition-colors shrink-0"
              >
                Restart Now
              </button>
            )}

            {/* Dismiss (only when not ready) */}
            {state !== 'ready' && (
              <button
                onClick={() => setDismissed(true)}
                className="ml-1 p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
