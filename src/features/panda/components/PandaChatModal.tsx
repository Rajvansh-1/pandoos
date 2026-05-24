import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Music, Play, Trash2, User as UserIcon } from 'lucide-react';
import { PandaMascot } from './PandaMascot';
import { searchTracks } from '@/services/youtube';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePandaStore } from '@/stores/usePandaStore';
import { useUIStore } from '@/stores/useUIStore';
import { TrackImage } from '@/components/shared/TrackImage';
import type { Track } from '@/types/track';

interface PandaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function PandaChatModal({ isOpen, onClose, initialMessage = '' }: PandaChatModalProps) {
  const { messages, addMessage, clearHistory } = usePandaStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatEmotion, setChatEmotion] = useState('chill');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const playTrack = usePlayerStore(s => s.playTrack);
  const openArtist = useUIStore(s => s.openArtist);

  const [lastProcessedMsg, setLastProcessedMsg] = useState('');

  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== lastProcessedMsg) {
      setLastProcessedMsg(initialMessage);
      handleSend(initialMessage);
      setInput('');
    }
  }, [isOpen, initialMessage, lastProcessedMsg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    addMessage({ sender: 'user', text });
    setInput('');
    setIsTyping(true);

    try {
      // 1. Get intelligence from the backend
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      
      if (!chatRes.ok) throw new Error('Chat API failed');
      
      const { reply, query, emotion } = await chatRes.json();
      
      if (emotion) setChatEmotion(emotion);
      
      // Post Panda's textual reply
      addMessage({ sender: 'panda', text: reply });
      
      // 2. If a query was returned, fetch the songs AND artists
      if (query) {
        const { songs, artists } = await searchTracks(query);
        
        // Output Artist if found
        if (artists && artists.length > 0) {
          const artist = artists[0];
          addMessage({
            sender: 'panda',
            text: `I also found an artist you might like: ${artist.name}! 🎤`,
            isAction: true,
            actionType: 'artist',
            artistPayload: artist
          });
        }

        if (songs && songs.length > 0) {
          const track = songs[0];
          addMessage({
            sender: 'panda',
            text: `I queued up "${track.title}"! Click to play it. 🎧`,
            isAction: true,
            actionType: 'play',
            trackPayload: track,
            playlistPayload: songs
          });
        }
      }
      setIsTyping(false);
    } catch (e) {
      setIsTyping(false);
      addMessage({
        sender: 'panda',
        text: "Uh oh, my bamboo connection dropped! Try asking again."
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 z-[100] flex flex-col w-full sm:w-[480px] shadow-2xl pointer-events-none"
        >
          {/* Backdrop only for mobile */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto sm:hidden"
            onClick={onClose}
          />
          
          <div className="flex-1 w-full h-full bg-gradient-to-b from-surface-elevated/95 to-surface-base/95 backdrop-blur-3xl border-l border-white/10 flex flex-col pointer-events-auto relative z-10 shadow-[-30px_0_80px_rgba(0,0,0,0.6)]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-transparent opacity-50 pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary/40 to-brand-secondary/40 flex items-center justify-center overflow-hidden border-2 border-brand-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.3)] relative"
                >
                  <PandaMascot size={48} emotion={isTyping ? 'focus' : chatEmotion} />
                </motion.div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight drop-shadow-sm">Pandoo AI <Sparkles size={14} className="inline text-brand-primary mb-1" /></h3>
                  <p className="text-xs font-semibold text-brand-primary flex items-center gap-1.5 opacity-90">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                    Listening to you...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <button 
                  onClick={clearHistory}
                  title="Wipe Memory"
                  className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all shadow-inner"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={onClose} className="p-2.5 rounded-full bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-all shadow-inner">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 scroll-container bg-noise">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`flex flex-col w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`relative max-w-[85%] px-5 py-3.5 rounded-[1.5rem] text-[15px] leading-relaxed shadow-lg backdrop-blur-md ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white rounded-tr-sm font-medium border border-white/20 shadow-[0_10px_20px_rgba(139,92,246,0.3)]' 
                      : 'bg-white/10 text-white/95 rounded-tl-sm border border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.2)]'
                  }`}>
                    {msg.text}
                  </div>
                  
                  {/* Actionable Rich UI Track Card */}
                  {msg.trackPayload && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      className="mt-3 w-[280px] bg-white/5 backdrop-blur-xl border border-white/20 rounded-[1.25rem] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.4)] group hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative shadow-md">
                          <TrackImage videoId={msg.trackPayload.videoId} title={msg.trackPayload.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                            <Music size={16} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate drop-shadow-sm">{msg.trackPayload.title}</p>
                          <p className="text-[11px] font-medium text-white/60 truncate mt-0.5">{msg.trackPayload.artist}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => playTrack(msg.trackPayload!, msg.playlistPayload || [msg.trackPayload!])}
                        className="w-full py-3 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 hover:from-brand-primary/40 hover:to-brand-secondary/40 text-brand-primary font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-t border-white/10"
                      >
                        <Play size={14} fill="currentColor" /> Play Instantly
                      </button>
                    </motion.div>
                  )}

                  {/* Actionable Rich UI Artist Card */}
                  {msg.artistPayload && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      className="mt-3 w-[280px] bg-white/5 backdrop-blur-xl border border-white/20 rounded-[1.25rem] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.4)] group hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => openArtist(msg.artistPayload!.artistId)}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative shadow-md border-2 border-white/10">
                          {msg.artistPayload.thumbnails && msg.artistPayload.thumbnails.length > 0 ? (
                            <img src={msg.artistPayload.thumbnails[0].url} alt={msg.artistPayload.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <UserIcon size={24} className="text-white/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate drop-shadow-sm">{msg.artistPayload.name}</p>
                          <p className="text-[11px] font-medium text-brand-secondary truncate mt-0.5 uppercase tracking-wider">Artist</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white/10 px-5 py-4 rounded-[1.5rem] rounded-tl-sm flex gap-2 items-center border border-white/10 shadow-lg backdrop-blur-md">
                    <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce shadow-glow-sm" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce shadow-glow-sm" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce shadow-glow-sm" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-white/10 bg-black/40 backdrop-blur-2xl relative z-20">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex items-center gap-3 relative"
              >
                <div className="absolute left-4 text-white/40 pointer-events-none">
                  <Sparkles size={18} />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Tell Pandoo what you want..."
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-primary/50 rounded-full pl-12 pr-5 py-4 text-[15px] font-medium text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-all shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center disabled:opacity-50 disabled:scale-100 hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                >
                  <Send size={20} className="ml-1" />
                </button>
              </form>
            </div>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
