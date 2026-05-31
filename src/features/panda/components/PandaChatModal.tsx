import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { Sparkles, Send, X, Play, Trash2, User as UserIcon } from 'lucide-react';
import { PandaMascot } from './PandaMascot';
import { searchTracks } from '@/services/youtube';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePandaStore } from '@/stores/usePandaStore';
import { useUIStore } from '@/stores/useUIStore';
import { TrackImage } from '@/components/shared/TrackImage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHardwareBack } from '@/hooks/useHardwareBack';

interface PandaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

const SUGGESTIONS = [
  '🎵 Play something chill',
  '🔥 Trending Bollywood',
  '💔 Sad songs please',
  '⚡ Workout energy',
  '🌙 Late night vibes',
  '🎸 Classic rock hits',
];

export function PandaChatModal({ isOpen, onClose, initialMessage = '' }: PandaChatModalProps) {
  const { messages, addMessage, clearHistory } = usePandaStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatEmotion, setChatEmotion] = useState('chill');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const playTrack = usePlayerStore(s => s.playTrack);
  const openArtist = useUIStore(s => s.openArtist);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [lastProcessedMsg, setLastProcessedMsg] = useState('');

  useHardwareBack(isOpen, onClose);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setShowSuggestions(false);
    addMessage({ sender: 'user', text });
    setInput('');
    setIsTyping(true);

    try {
      const chatRes = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!chatRes.ok) throw new Error('Chat API failed');
      const { reply, query, emotion } = await chatRes.json();

      if (emotion) setChatEmotion(emotion);
      addMessage({ sender: 'panda', text: reply });

      if (query) {
        const { songs, artists } = await searchTracks(query);

        if (artists && artists.length > 0) {
          const artist = artists[0];
          addMessage({
            sender: 'panda',
            text: `Found an artist you might love: ${artist.name} 🎤`,
            isAction: true,
            actionType: 'artist',
            artistPayload: artist,
          });
        }

        if (songs && songs.length > 0) {
          const track = songs[0];
          addMessage({
            sender: 'panda',
            text: `Queued up "${track.title}" — tap to play 🎧`,
            isAction: true,
            actionType: 'play',
            trackPayload: track,
            playlistPayload: songs,
          });
        }
      }
    } catch {
      addMessage({ sender: 'panda', text: 'Uh oh, my bamboo connection dropped! Try asking again 🐼' });
    } finally {
      setIsTyping(false);
    }
  }, [addMessage]);

  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== lastProcessedMsg) {
      setLastProcessedMsg(initialMessage);
      handleSend(initialMessage);
    }
  }, [isOpen, initialMessage, lastProcessedMsg, handleSend]);

  useEffect(() => {
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 60);
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 300); }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) setShowSuggestions(false);
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderModalContent = () => (
    <>
      {/* Glass background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d1a]/97 via-[#0a0a14]/95 to-[#07070f]/97 backdrop-blur-3xl" />
      {/* Ambient glow top */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-brand-primary/20 via-brand-secondary/10 to-transparent pointer-events-none" />
      {/* Animated border */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.08), rgba(59,130,246,0.05)) border-box',
      }} />

      <div className="relative z-10 flex flex-col h-full">

        {/* ── Header ── */}
        <div className="relative flex items-center gap-4 px-5 pt-5 pb-4 shrink-0">
          {isMobile && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20" />}
          
          <div className="relative shrink-0">
            <motion.div
              className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-primary/40 shadow-[0_0_20px_rgba(139,92,246,0.35)]"
              animate={isTyping ? { borderColor: ['rgba(139,92,246,0.4)', 'rgba(236,72,153,0.6)', 'rgba(139,92,246,0.4)'] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <PandaMascot size={48} emotion={isTyping ? 'focus' : chatEmotion} />
            </motion.div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0d0d1a] shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-white text-base tracking-tight">Pandoo AI</h3>
              <Sparkles size={12} className="text-brand-primary shrink-0" />
            </div>
            <p className="text-xs text-white/50 font-medium mt-0.5">
              {isTyping ? 'Thinking...' : 'Ask me anything about music'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={clearHistory} className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all flex items-center justify-center">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white transition-all flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3 scroll-container">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center flex-1 gap-4 py-8 text-center">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-secondary/20 border border-brand-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                <PandaMascot size={64} emotion="happy" />
              </motion.div>
              <div>
                <h4 className="text-white font-bold text-lg mb-1">Hey! I'm Pandoo 🐼</h4>
                <p className="text-white/50 text-sm max-w-[260px] leading-relaxed">Ask me to play music, discover artists, or set a vibe for you!</p>
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative max-w-[82%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-md ${msg.sender === 'user' ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white rounded-br-sm font-medium shadow-[0_4px_20px_rgba(139,92,246,0.35)]' : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/8 shadow-[0_4px_12px_rgba(0,0,0,0.3)]'}`}>
                {msg.text}
              </div>

              {msg.trackPayload && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-2 w-[260px] bg-white/6 backdrop-blur-xl border border-white/12 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] group">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative shadow-md">
                      <TrackImage videoId={msg.trackPayload.videoId} title={msg.trackPayload.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{msg.trackPayload.title}</p>
                      <p className="text-xs text-white/50 truncate mt-0.5">{msg.trackPayload.artist}</p>
                    </div>
                  </div>
                  <button onClick={() => { playTrack(msg.trackPayload!, msg.playlistPayload || [msg.trackPayload!]); onClose(); }} className="w-full py-2.5 bg-gradient-to-r from-brand-primary/30 to-brand-secondary/20 hover:from-brand-primary/50 hover:to-brand-secondary/40 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-t border-white/8">
                    <Play size={12} fill="currentColor" /> Play Now
                  </button>
                </motion.div>
              )}

              {msg.artistPayload && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-2 w-[260px] bg-white/6 backdrop-blur-xl border border-white/12 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { openArtist(msg.artistPayload!.artistId); onClose(); }}>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative shadow-md border border-white/10">
                      {msg.artistPayload.thumbnails?.[0]?.url ? (
                        <img src={msg.artistPayload.thumbnails[0].url} alt={msg.artistPayload.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center"><UserIcon size={20} className="text-white/50" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{msg.artistPayload.name}</p>
                      <p className="text-xs text-brand-primary uppercase tracking-wider mt-0.5">Artist · Tap to explore</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          <AnimatePresence>
            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex justify-start">
                <div className="bg-white/8 border border-white/8 px-4 py-3.5 rounded-2xl rounded-bl-sm flex gap-1.5 items-center shadow-md">
                  {[0, 150, 300].map((delay, i) => (
                    <motion.span key={i} className="w-2 h-2 rounded-full bg-brand-primary" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.7, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* ── Suggestions ── */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="shrink-0 px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scroll-container">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSend(s.replace(/^[^\s]+\s/, ''))} className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/70 hover:bg-white/12 hover:text-white transition-all whitespace-nowrap">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input ── */}
        <div className="shrink-0 px-4 pb-5 pt-2 border-t border-white/6">
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <div className="flex-1 relative">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Pandoo anything…" className="w-full bg-white/6 border border-white/10 focus:border-brand-primary/60 focus:bg-white/10 rounded-full pl-5 pr-4 py-3.5 text-[14px] text-white placeholder-white/30 focus:outline-none transition-all shadow-inner" />
            </div>
            <motion.button type="submit" disabled={!input.trim() || isTyping} whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.06 }} className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-opacity">
              <Send size={17} className="ml-0.5" />
            </motion.button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm" onClick={handleBackdrop} />

          {!isMobile && (
            <div className="fixed inset-0 z-[901] pointer-events-none flex items-center justify-center p-4 pl-[288px] pb-[100px]">
              <motion.div
                key="panel-desktop"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                className="pointer-events-auto flex flex-col rounded-[2rem] overflow-hidden shadow-2xl relative w-full h-full"
                style={{ maxWidth: '560px', maxHeight: '720px' }}
              >
                {renderModalContent()}
              </motion.div>
            </div>
          )}

          {isMobile && (
            <motion.div
              key="panel-mobile"
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              className="fixed bottom-0 left-0 right-0 z-[901] flex flex-col rounded-t-[2rem] overflow-hidden shadow-2xl bg-black"
              style={{ height: '88dvh', maxHeight: '88dvh' }}
            >
              {renderModalContent()}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
