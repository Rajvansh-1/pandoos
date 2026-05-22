import React from 'react';
import { cn } from '@/utils/cn';

interface TonearmProps {
  isPlaying: boolean;
  className?: string;
}

export function Tonearm({ isPlaying, className }: TonearmProps) {
  return (
    <div 
      className={cn(
        "absolute origin-[80%_15%] will-change-transform transform-gpu z-20 pointer-events-none", 
        className
      )}
      style={{ 
        width: '40%', 
        height: '100%', 
        transform: isPlaying ? 'rotate(22deg)' : 'rotate(0deg)',
        transition: isPlaying 
          ? 'transform 800ms cubic-bezier(0.2, 0.8, 0.2, 1)' 
          : 'transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <svg 
        viewBox="0 0 100 300" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <filter id="armShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="10" dy="20" stdDeviation="15" floodColor="#000" floodOpacity="0.6"/>
          </filter>
          <linearGradient id="chrome" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e5e5" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#8c8c8c" />
            <stop offset="75%" stopColor="#e5e5e5" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>

          <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#333" />
            <stop offset="50%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>

          <linearGradient id="armHighlight" x1="0%" y1="0%" x2="10%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Group with SVG drop-shadow filter (much faster than CSS drop-shadow) */}
        <g filter="url(#armShadow)">

        {/* Pivot Base */}
        <circle cx="80" cy="45" r="28" fill="url(#darkMetal)" stroke="#111" strokeWidth="2" />
        <circle cx="80" cy="45" r="20" fill="url(#chrome)" opacity="0.9" />
        <circle cx="80" cy="45" r="16" fill="url(#darkMetal)" />
        <circle cx="80" cy="45" r="6" fill="#fff" opacity="0.8" />
        
        {/* Counterweight */}
        <rect x="65" y="5" width="30" height="24" rx="4" fill="url(#chrome)" stroke="#111" />
        <rect x="70" y="2" width="20" height="8" rx="2" fill="url(#darkMetal)" />
        
        {/* Tonearm Shaft */}
        {/* Outer shadow/thickness */}
        <path d="M78 65 L43 220" stroke="#111" strokeWidth="8" strokeLinecap="round" />
        {/* Chrome tube */}
        <path d="M77 65 L42 220" stroke="url(#chrome)" strokeWidth="6" strokeLinecap="round" />
        {/* Specular highlight on tube */}
        <path d="M76 65 L41 220" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Headshell Joint */}
        <circle cx="41" cy="220" r="10" fill="url(#darkMetal)" stroke="url(#chrome)" strokeWidth="1.5" />

        {/* Headshell (holds stylus) */}
        <path 
          d="M37 218 L15 255 L26 265 L46 222 Z" 
          fill="url(#darkMetal)" 
          stroke="#111" 
          strokeWidth="1.5"
        />
        <path 
          d="M34 220 L16 253" 
          stroke="url(#chrome)" 
          strokeWidth="1" 
          opacity="0.5"
        />
        
        {/* Stylus Glowing Tip */}
        <circle cx="20" cy="258" r="3" fill="#ef4444" />
        <circle cx="20" cy="258" r="1.5" fill="#fff" />
        {/* Glow effect */}
        <circle cx="20" cy="258" r="6" fill="#ef4444" opacity="0.4" filter="blur(2px)" />
        </g>
      </svg>
    </div>
  );
}
