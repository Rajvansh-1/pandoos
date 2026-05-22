import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Music } from 'lucide-react';
import { PandaMascot } from './PandaMascot';
import { useSearch } from '@/features/search/hooks/useSearch';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface Message {
  id: string;
  sender: 'user' | 'panda';
  text: string;
  isAction?: boolean;
}

interface PandaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function PandaChatModal({ isOpen, onClose, initialMessage = '' }: PandaChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'panda', text: "Hey! I'm Pandoo. Tell me how you're feeling or what you want to hear, and I'll find the perfect tracks for you!" }
  ]);
  const [input, setInput] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [chatEmotion, setChatEmotion] = useState('chill');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Use search to find tracks based on the conversation
  const { data: searchResults, isLoading } = useSearch(currentQuery);
  const playTrack = usePlayerStore(s => s.playTrack);

  useEffect(() => {
    if (isOpen && initialMessage && messages.length === 1) {
      handleSend(initialMessage);
      setInput('');
    }
  }, [isOpen, initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (currentQuery && !isLoading && searchResults && searchResults.length > 0) {
      setIsTyping(false);
      const track = searchResults[0];
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), sender: 'panda', text: `Found it! Playing "${track.title}" and queued ${searchResults.length - 1} relevant tracks! 🎧`, isAction: true }
      ]);
      playTrack(track, searchResults);
      setCurrentQuery(''); // Reset so we don't trigger again
    } else if (currentQuery && !isLoading && searchResults && searchResults.length === 0) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), sender: 'panda', text: "Hmm, I couldn't find exactly that. Try telling me a mood or genre!" }
      ]);
      setCurrentQuery('');
    }
  }, [searchResults, isLoading, currentQuery, playTrack]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    const newMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    // Simple NLP / keyword extraction to form a query
    const lower = text.toLowerCase();
    let query = text; // default to exact search
    let reply = "Let me dig into my bamboo forest for that...";
    let newEmotion = 'focus';
    
    if (lower.includes('sad') || lower.includes('cry') || lower.includes('heartbreak')) { 
      reply = "I'm here for you. Let's play some sad songs to let it out. 🌧️"; 
      query = "sad emotional acoustic heartbreak"; 
      newEmotion = 'heartbroken';
    }
    else if (lower.includes('workout') || lower.includes('gym')) { 
      reply = "Time to crush it! Let's get pumped! 🏋️‍♂️"; 
      query = "heavy workout gym phonk"; 
      newEmotion = 'workout';
    }
    else if (lower.includes('happy') || lower.includes('good mood') || lower.includes('dance')) { 
      reply = "Awesome! Let's keep the good vibes rolling and dance! ☀️"; 
      query = "happy feel good uplifting pop dance hits"; 
      newEmotion = 'happy';
    }
    else if (lower.includes('sleep') || lower.includes('bed') || lower.includes('tired')) { 
      reply = "Shh... time to rest. Here's some ambient magic. 💤"; 
      query = "sleep ambient delta waves lullaby"; 
      newEmotion = 'sleepy';
    }
    else if (lower.includes('chill') || lower.includes('relax') || lower.includes('lofi')) {
      reply = "Got it. Bamboo, tea, and lo-fi beats. 🍃";
      query = "lofi chill relax aesthetic beats";
      newEmotion = 'chill';
    }
    else if (lower.includes('desi') || lower.includes('punjabi')) {
      reply = "Pure swag incoming! 🔥";
      query = "desi hip hop punjabi swag hits";
      newEmotion = 'desi';
    }
    else if (lower.includes('bollywood') || lower.includes('hindi')) {
      reply = "Ah, the magic of Bollywood. Setting the stage... ✨";
      query = "bollywood pop romantic hits";
      newEmotion = 'bollywood';
    }
    else if (lower.includes('romantic') || lower.includes('love')) {
      reply = "Love is in the air. Playing some romantic hits. 💖";
      query = "romantic love songs acoustic";
      newEmotion = 'romantic';
    }
    else {
      reply = `Searching for exactly what you asked for: "${text}"... 🔍`;
      newEmotion = 'focus';
    }
    
    setChatEmotion(newEmotion);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'panda', text: reply }]);
      // Trigger the search query which will then trigger the useEffect above
      setTimeout(() => setCurrentQuery(query), 1000);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          
          <div className="w-full h-[85vh] sm:h-[600px] sm:max-w-md bg-surface-base/90 backdrop-blur-2xl border border-white/10 sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col pointer-events-auto overflow-hidden relative">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center overflow-hidden border border-brand-primary/50">
                  <PandaMascot size={40} emotion={isTyping ? 'focus' : chatEmotion} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Pandoo AI</h3>
                  <p className="text-xs text-brand-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-container">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-brand-primary text-white rounded-tr-sm' 
                      : msg.isAction 
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tl-sm shadow-glow-sm'
                        : 'bg-white/10 text-white/90 rounded-tl-sm'
                  }`}>
                    {msg.isAction && <Music size={14} className="inline mr-2 mb-0.5" />}
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white/10 p-4 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Tell Pandoo what you want..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-primary focus:bg-white/10 transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 transition-all shadow-glow-sm"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
