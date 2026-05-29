import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function DesktopTitleBar() {
  // If we aren't in Electron, don't show the custom title bar
  if (!window.electronAPI) return null;

  return (
    <div 
      className="w-full h-8 flex items-center justify-between z-[10000] relative"
      style={{ 
        WebkitAppRegion: 'drag', // Makes the title bar draggable
        background: 'rgba(10, 10, 15, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      } as any}
    >
      {/* Brand / Logo Area */}
      <div className="flex items-center gap-2 pl-3 pointer-events-none">
        <img src="/logo.png" alt="Pandoos" className="w-4 h-4 object-contain" />
        <span className="text-xs font-display font-bold text-white/80 tracking-wide">Pandoos Music</span>
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any} // Prevent dragging on buttons
      >
        <button 
          onClick={() => window.electronAPI?.minimize()}
          className="w-12 h-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => window.electronAPI?.maximize()}
          className="w-12 h-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => window.electronAPI?.close()}
          className="w-12 h-full flex items-center justify-center text-white/50 hover:bg-red-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Add TypeScript declaration for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      onMediaPlayPause: (cb: () => void) => void;
      onMediaNext: (cb: () => void) => void;
      onMediaPrev: (cb: () => void) => void;
      onRawArrowKey?: (cb: (key: string) => void) => void;
      removeMediaListeners: () => void;
    };
  }
}
