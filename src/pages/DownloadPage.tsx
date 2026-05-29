import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Download, Check, Apple, Globe, Laptop2, MessageSquare } from 'lucide-react';

export function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect OS for specific recommendations
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

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
    <div className="min-h-screen bg-[#0a0f0d] text-white pt-24 pb-32 px-6 relative overflow-hidden">
      {/* Mesmerizing Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/30 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/20 blur-[150px] pointer-events-none" />

      <Helmet>
        <title>Download Pandoos | The Music Ecosystem</title>
        <meta name="description" content="Download Pandoos for Desktop, Android, or install the Web App. Experience seamless cross-device music sync." />
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-16 relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="relative inline-block mb-4 group">
            <div className="absolute inset-0 bg-brand-primary/40 blur-2xl rounded-full scale-110 group-hover:bg-fuchsia-500/40 transition-colors duration-700" />
            <img 
              src="/logo.png" 
              alt="Pandoos Logo" 
              className="w-28 h-28 object-contain relative z-10 drop-shadow-2xl animate-float"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-br from-white via-brand-primary to-fuchsia-400 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
            Get Pandoos Everywhere
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
            Experience seamless sync across the entire Pandoos ecosystem. Install the desktop client or lightweight web app.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Web / PWA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-white/5 border ${deviceType === 'ios' ? 'border-brand-primary shadow-[0_0_20px_rgba(156,106,222,0.2)]' : 'border-white/10'} rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors relative overflow-hidden`}
          >
            {deviceType === 'ios' && (
              <div className="absolute top-0 right-0 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-lg">
                Recommended
              </div>
            )}
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
            className={`bg-white/5 border ${deviceType === 'desktop' ? 'border-brand-primary shadow-[0_0_20px_rgba(156,106,222,0.2)]' : 'border-white/10'} rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors relative overflow-hidden`}
          >
            {deviceType === 'desktop' && (
              <div className="absolute top-0 right-0 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-lg">
                Recommended
              </div>
            )}
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
            className={`bg-white/5 border ${deviceType === 'android' ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-white/10'} rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors relative overflow-hidden`}
          >
            {deviceType === 'android' && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-lg">
                Recommended
              </div>
            )}
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
              <span className="flex items-center gap-2">Coming Soon <img src="/logo.png" alt="Pandoos" className="w-5 h-5 object-contain" /></span>
              <span className="text-xs font-normal opacity-70">The Panda is still coding this...</span>
            </div>
          </motion.div>

        </div>
        
        {/* Bug Report / Feedback */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 relative overflow-hidden rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 via-brand-primary/10 to-orange-900/30 opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 shrink-0 relative z-10 shadow-[0_0_30px_rgba(248,113,113,0.3)]">
            <MessageSquare size={32} />
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-2xl font-bold mb-2">Help Us Improve</h2>
            <p className="text-white/60">
              Found a bug or have a suggestion to make the Pandoos experience even better? Let our developer pandas know!
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
            <a 
              href="mailto:support@pandoos.app"
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl font-bold text-sm text-center border border-red-500/30 transition-all flex items-center justify-center gap-2"
            >
              Report an Issue
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
