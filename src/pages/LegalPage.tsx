import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, Mail, Heart, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'privacy' | 'terms';

export function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>('privacy');
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen pb-32 flex flex-col bg-[#0a0a0f] overflow-x-hidden pt-safe relative">
      <Helmet>
        <title>Legal & Privacy | Pandoos</title>
      </Helmet>

      {/* Background flare */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-brand-primary/10 via-brand-accent/5 to-transparent -z-10 pointer-events-none" />

      {/* Header */}
      <header className="w-full px-4 md:px-8 pt-6 pb-2 z-50 sticky top-0 backdrop-blur-xl border-b border-white/5" style={{ background: 'rgba(10,10,15,0.7)' }}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/80" />
          </button>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Legal & Privacy
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="w-full max-w-3xl mx-auto px-4 mt-8 mb-8">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'privacy' 
                ? 'bg-brand-primary text-white shadow-lg' 
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield size={16} />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'terms' 
                ? 'bg-brand-primary text-white shadow-lg' 
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            Terms of Service
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="prose prose-invert prose-brand max-w-none prose-p:text-white/70 prose-headings:text-white/90 prose-a:text-brand-primary"
          >
            {activeTab === 'privacy' ? (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-sm">
                <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                  <Shield className="text-brand-primary" /> Privacy Policy
                </h2>
                
                <p>
                  At Pandoos, your privacy and data security are our top priority. 
                  We believe that what you listen to is your business, and we are committed to ensuring your experience remains safe, transparent, and respectful of your data.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">1. Information We Collect</h3>
                <p>
                  We collect only the minimum necessary information to provide you with the best music streaming experience:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-white/70">
                  <li><strong>Account Information:</strong> If you choose to log in, we store basic profile details such as your username and avatar.</li>
                  <li><strong>Usage Data:</strong> We store your listening history, liked songs, and created playlists locally on your device or synced to our secure database to personalize your experience.</li>
                  <li><strong>Device Information:</strong> We may collect non-identifiable data such as OS type or app version to improve app stability.</li>
                </ul>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">2. How We Use Your Data</h3>
                <p>
                  We do not sell, rent, or secretly share your personal data with third parties. Your data is used exclusively to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-white/70">
                  <li>Provide personalized music recommendations (The Beast Oracle).</li>
                  <li>Maintain your cross-device playback state and gamification progress.</li>
                  <li>Analyze generic trends to fix bugs and improve performance.</li>
                </ul>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">3. Third-Party Services</h3>
                <p>
                  Pandoos navigates the hidden currents of the internet to curate your musical journey. While we interface with external realms to bring you streams, your personal identity and Pandoos account remain strictly behind our walls.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">4. Your Rights & Control</h3>
                <p>
                  You have full control over your data. You can clear your app cache, delete your listening history, or permanently delete your account at any time from the app settings.
                </p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-sm">
                <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                  <FileText className="text-brand-primary" /> Terms of Service
                </h2>
                
                <p>
                  Welcome to Pandoos. By accessing or using our application, you agree to be bound by these terms. Please read them carefully.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">1. Acceptance of Terms</h3>
                <p>
                  By downloading, installing, or using Pandoos, you agree to comply with these Terms of Service. If you do not agree with any part of these terms, you may not use our service.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">2. Description of Service</h3>
                <p>
                  Pandoos is a specialized music streaming client that aggregates publicly available audio streams and metadata from various internet sources. We provide a gamified, personalized interface for discovering and listening to music.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">3. User Conduct & Responsibilities</h3>
                <ul className="list-disc pl-5 space-y-2 text-white/70">
                  <li>You agree to use Pandoos for personal, non-commercial use only.</li>
                  <li>You must not attempt to reverse engineer, hack, or disrupt the Pandoos infrastructure or associated APIs.</li>
                  <li>You are responsible for any data charges incurred while streaming music over cellular networks.</li>
                </ul>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">4. Intellectual Property & Copyright</h3>
                <p>
                  Pandoos does not host, upload, or own the audio content streamed through the app. All music, album art, and related metadata belong to their respective copyright holders. Pandoos operates strictly as an aggregator and player interface.
                </p>

                <h3 className="text-lg font-bold mt-8 mb-4 text-white/90">5. Limitation of Liability</h3>
                <p>
                  Pandoos is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or that the app will be free of bugs. In no event shall the creators of Pandoos be liable for any indirect or consequential damages arising from your use of the app.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer info card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 border border-brand-primary/30 rounded-3xl p-6 md:p-8 text-center"
        >
          <div className="w-16 h-16 bg-black/40 rounded-full mx-auto flex items-center justify-center mb-4 border border-white/10 shadow-lg">
            <Heart className="text-brand-primary fill-brand-primary/20" size={28} />
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-2">Crafted with Passion</h3>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-6">
            Pandoos is proudly authored and created by <strong className="text-white">Rajvansh</strong>. 
            Our mission is to redefine how you experience and connect with music emotionally.
          </p>
          
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <span className="text-sm font-semibold text-white/80">Wanna contribute or report a bug?</span>
            <a 
              href="mailto:pandoosmusic@gmail.com" 
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-glow-sm"
            >
              <Mail size={16} />
              pandoosmusic@gmail.com
            </a>
          </div>
        </motion.div>

        <div className="h-12" /> {/* Bottom spacing */}
      </div>
    </div>
  );
}
