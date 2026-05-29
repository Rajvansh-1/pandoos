import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Zap, WifiOff, Share } from 'lucide-react';

/**
 * PWAInstallPrompt — Beautiful Panda-themed install banner.
 * 
 * Shows every time the user opens the web app (unless already installed as PWA).
 * - Chrome/Edge: Uses beforeinstallprompt to trigger native install dialog
 * - Safari iOS: Shows manual "Add to Home Screen" instructions
 * - Already installed: Never shows (display-mode: standalone check)
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Don't show if already running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Don't show on Electron desktop
    if ((window as any).electronAPI) return;

    // Detect iOS Safari
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    // For iOS, just show the prompt after a short delay
    if (isiOS) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }

    // For Chrome/Edge — intercept the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay so the page loads first
      setTimeout(() => setShowPrompt(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('[PWA] Install error:', err);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Auto-dismiss after 15 seconds so it's not annoying
  useEffect(() => {
    if (showPrompt) {
      dismissTimerRef.current = window.setTimeout(() => {
        setShowPrompt(false);
      }, 15000);
      return () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      };
    }
  }, [showPrompt]);

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-[99999] md:left-auto md:right-6 md:bottom-6 md:w-[400px]"
          role="dialog"
          aria-label="Install Pandoos app"
        >
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(156, 106, 222, 0.15) 0%, rgba(10, 10, 15, 0.95) 50%, rgba(255, 107, 157, 0.1) 100%)',
              backdropFilter: 'blur(40px) saturate(150%)',
              WebkitBackdropFilter: 'blur(40px) saturate(150%)',
              border: '1px solid rgba(156, 106, 222, 0.25)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(156, 106, 222, 0.15)',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
              aria-label="Dismiss"
            >
              <X size={16} className="text-white/60" />
            </button>

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-3xl"
                >
                  🐼
                </motion.div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">
                    Install Pandoos
                  </h3>
                  <p className="text-white/50 text-xs">
                    Lightning-fast music, right from your home screen
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="flex gap-4 mb-4 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-yellow-400" />
                  <span>Instant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <WifiOff size={12} className="text-blue-400" />
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone size={12} className="text-green-400" />
                  <span>App-like</span>
                </div>
              </div>

              {/* Action */}
              {isIOS ? (
                /* iOS: Manual instructions */
                <div 
                  className="rounded-xl p-3 text-sm text-white/80"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Share size={14} className="text-blue-400" />
                    <span className="font-medium text-white/90">
                      Tap the <strong>Share</strong> button below
                    </span>
                  </div>
                  <p className="text-white/50 text-xs pl-6">
                    Then tap <strong>"Add to Home Screen"</strong>
                  </p>
                </div>
              ) : deferredPrompt ? (
                /* Chrome/Edge: Native install button */
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #9C6ADE, #FF6B9D)',
                    boxShadow: '0 4px 20px rgba(156, 106, 222, 0.35)',
                  }}
                >
                  {installing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Download size={16} />
                      Install Pandoos
                    </>
                  )}
                </button>
              ) : (
                /* Fallback: No install prompt available */
                <p className="text-white/40 text-xs text-center">
                  Add this page to your home screen for the best experience
                </p>
              )}
            </div>

            {/* Subtle gradient line at bottom */}
            <div 
              className="h-0.5"
              style={{ background: 'linear-gradient(90deg, #9C6ADE, #FF6B9D, #9C6ADE)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
