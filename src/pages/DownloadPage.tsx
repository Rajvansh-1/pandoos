import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Download, Check, Apple, Globe, Laptop2, Terminal } from 'lucide-react';

export function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS for specific PWA instructions
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white pt-24 pb-32 px-6">
      <Helmet>
        <title>Download Pandoos | The Music Ecosystem</title>
        <meta name="description" content="Download Pandoos for Desktop, Android, or install the Web App. Experience seamless cross-device music sync." />
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-primary/20 rounded-full mb-4">
            <span className="text-6xl">🐼</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-br from-white via-white/90 to-brand-primary bg-clip-text text-transparent">
            Get Pandoos Everywhere
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
            Experience Spotify-level sync across all your devices. Install the native app, desktop client, or lightweight web app.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Web / PWA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
              <Globe size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3">Web App (PWA)</h2>
            <p className="text-white/60 mb-8 flex-1">
              Ultra-lightweight. Installs instantly to your home screen without App Store delays. Supports background audio and offline caching.
            </p>
            
            {isInstallable ? (
              <button 
                onClick={handleInstallClick}
                className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Install Web App
              </button>
            ) : isIOS ? (
              <div className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-left">
                <p className="font-bold mb-2 flex items-center gap-2"><Apple size={16}/> iOS Install Guide:</p>
                <ol className="list-decimal pl-4 text-white/60 space-y-1">
                  <li>Tap the <strong>Share</strong> button at the bottom of Safari</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            ) : (
              <button disabled className="w-full bg-white/5 text-white/40 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                <Check size={20} />
                Already Installed / Not Supported
              </button>
            )}
          </motion.div>

          {/* Desktop App */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              Recommended
            </div>
            <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center mb-6 text-brand-primary">
              <Laptop2 size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3">Desktop App</h2>
            <p className="text-white/60 mb-8 flex-1">
              Full Electron-powered desktop experience for Windows, Mac, and Linux. Built-in Discord Rich Presence and system media controls.
            </p>
            <a 
              href="https://github.com/Rajvansh-1/pandoos/releases/latest" 
              target="_blank" 
              rel="noreferrer"
              className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download for PC
            </a>
          </motion.div>

          {/* Android Native */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors"
          >
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-400">
              <Smartphone size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              Android App
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">Soon</span>
            </h2>
            <p className="text-white/60 mb-8 flex-1">
              Native Kotlin app powered by ExoPlayer. Perfect background playback, Android Auto support, and ultra-low battery usage. 
            </p>
            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold py-4 rounded-xl flex flex-col items-center justify-center gap-1">
              <span>Coming Soon 🐼</span>
              <span className="text-xs font-normal opacity-70">The Panda is still coding this...</span>
            </div>
          </motion.div>

        </div>
        
        {/* CLI / Advanced */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-[#13111c] border border-brand-primary/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shrink-0">
            <Terminal size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-2">Build from Source</h2>
            <p className="text-white/60">
              Pandoos is fully open-source. Want to contribute or build the ecosystem yourself? Check out our repositories on GitHub.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <a 
              href="https://github.com/Rajvansh-1/pandoos" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-center border border-white/10 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
