import React from 'react';

/**
 * PandaLoader — Anime "Moonlit Bamboo Forest" loading screen.
 *
 * Fixes applied vs previous version:
 *  • Removed invalid `r:` property from CSS keyframes (caused silent style failure)
 *  • Removed `position: relative` from SVG element
 *  • Cleaner, more browser-compatible CSS
 *  • Background lightened from near-black to visible deep-blue (#0a0c28)
 *  • All gradient IDs use unique suffixes to avoid document conflicts
 */
export function PandaLoader() {
  return (
    <>
      <style>{`
        /* ═══ ROOT ═══════════════════════════════════════════ */
        .pl-root {
          position: fixed; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 18px;
          background: #0a0c28;
          z-index: 9999;
          overflow: hidden;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Shifting aurora overlay */
        .pl-aurora {
          position: absolute; inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 80% 50% at 18% 22%, rgba(0,210,140,0.13) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 82% 78%, rgba(167,139,250,0.11) 0%, transparent 55%);
          animation: pl-aur 6s ease-in-out infinite alternate;
        }
        @keyframes pl-aur {
          from { opacity: 0.6; }
          to   { opacity: 1; }
        }

        /* ═══ SVG SCENE ══════════════════════════════════════ */
        .pl-scene {
          width: clamp(180px, 55vmin, 240px);
          height: auto;
          overflow: visible;
          display: block;
        }

        /* ═══ BAMBOO ═════════════════════════════════════════ */
        .pl-bam {
          transform-origin: 100px 342px;
          animation: pl-bams 3s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes pl-bams {
          0%,100% { transform: rotate(0deg);    }
          20%     { transform: rotate(-0.6deg); }
          33%     { transform: rotate(-1.0deg); }
          43%     { transform: rotate(2.6deg);  }
          52%     { transform: rotate(-1.5deg); }
          65%     { transform: rotate(3.0deg);  }
          73%     { transform: rotate(-0.5deg); }
          88%     { transform: rotate(0deg);    }
        }

        /* Leaves */
        .pl-ll { transform-box: fill-box; transform-origin: 75% 90%; animation: pl-lfl 3s ease-in-out infinite; }
        .pl-lr { transform-box: fill-box; transform-origin: 25% 90%; animation: pl-lfr 3s ease-in-out infinite; }
        @keyframes pl-lfl {
          0%,100% { transform: rotate(0deg);   }
          38%     { transform: rotate(10deg);  }
          68%     { transform: rotate(-8deg);  }
        }
        @keyframes pl-lfr {
          0%,100% { transform: rotate(0deg);   }
          38%     { transform: rotate(-9deg);  }
          68%     { transform: rotate(12deg);  }
        }

        /* ═══ STARS — opacity only, no r property ═════════ */
        .st { animation: pl-stw 2s ease-in-out infinite; }
        .st:nth-child(2)  { animation-duration: 2.5s; animation-delay: 0.3s; }
        .st:nth-child(3)  { animation-duration: 1.8s; animation-delay: 0.7s; }
        .st:nth-child(4)  { animation-duration: 3.0s; animation-delay: 1.1s; }
        .st:nth-child(5)  { animation-duration: 2.3s; animation-delay: 1.6s; }
        .st:nth-child(6)  { animation-duration: 2.7s; animation-delay: 0.4s; }
        .st:nth-child(7)  { animation-duration: 1.9s; animation-delay: 0.9s; }
        .st:nth-child(8)  { animation-duration: 2.4s; animation-delay: 0.2s; }
        .st:nth-child(9)  { animation-duration: 2.8s; animation-delay: 1.4s; }
        .st:nth-child(10) { animation-duration: 2.1s; animation-delay: 0.6s; }
        @keyframes pl-stw {
          0%,100% { opacity: 0.2; }
          50%     { opacity: 1;   }
        }

        /* ═══ SAKURA PETALS ══════════════════════════════════ */
        .pl-p1 { animation: pl-pt1 4.2s ease-in-out infinite 0.0s; }
        .pl-p2 { animation: pl-pt2 5.1s ease-in-out infinite 1.2s; }
        .pl-p3 { animation: pl-pt3 4.6s ease-in-out infinite 2.3s; }
        .pl-p4 { animation: pl-pt4 3.8s ease-in-out infinite 0.7s; }
        @keyframes pl-pt1 {
          0%   { transform: translate(0,0) rotate(0deg);        opacity: 0;   }
          12%  { opacity: 0.85; }
          80%  { opacity: 0.45; }
          100% { transform: translate(-38px,-86px) rotate(-130deg); opacity: 0; }
        }
        @keyframes pl-pt2 {
          0%   { transform: translate(0,0) rotate(20deg);       opacity: 0;   }
          12%  { opacity: 0.75; }
          80%  { opacity: 0.3;  }
          100% { transform: translate(32px,-72px) rotate(185deg);  opacity: 0; }
        }
        @keyframes pl-pt3 {
          0%   { transform: translate(0,0) rotate(-10deg);      opacity: 0;   }
          18%  { opacity: 0.65; }
          80%  { opacity: 0.2;  }
          100% { transform: translate(-22px,-60px) rotate(-95deg); opacity: 0; }
        }
        @keyframes pl-pt4 {
          0%   { transform: translate(0,0) rotate(40deg);       opacity: 0;   }
          16%  { opacity: 0.7;  }
          80%  { opacity: 0.2;  }
          100% { transform: translate(25px,-74px) rotate(205deg);  opacity: 0; }
        }

        /* ═══ PANDA CLIMB ════════════════════════════════════ */
        .pl-panda {
          animation: pl-clmb 3s cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes pl-clmb {
          0%   { transform: translateY(0px)    rotate(0deg);  opacity: 1; }
          8%   { transform: translateY(-46px)  rotate(-2deg); opacity: 1; }
          20%  { transform: translateY(-104px) rotate(2deg);  opacity: 1; }
          33%  { transform: translateY(-190px) rotate(-1deg); opacity: 1; }
          /* SLIP */
          43%  { transform: translateY(-136px) rotate(5deg);  opacity: 1; }
          /* Catch */
          52%  { transform: translateY(-164px) rotate(-1deg); opacity: 1; }
          /* JUMP */
          64%  { transform: translateY(-240px) rotate(0deg);  opacity: 1; }
          /* Land + bounce */
          70%  { transform: translateY(-206px) rotate(0deg);  opacity: 1; }
          74%  { transform: translateY(-216px) rotate(0deg);  opacity: 1; }
          78%  { transform: translateY(-210px) rotate(0deg);  opacity: 1; }
          /* Celebrate */
          88%  { transform: translateY(-210px) rotate(0deg);  opacity: 1; }
          /* Fade out */
          93%  { transform: translateY(-210px) rotate(0deg);  opacity: 0; }
          94%  { transform: translateY(0px)    rotate(0deg);  opacity: 0; }
          /* Fade in */
          100% { transform: translateY(0px)    rotate(0deg);  opacity: 1; }
        }

        /* Aura glow behind panda */
        .pl-aura-e {
          animation: pl-aura-a 3s ease-in-out infinite;
        }
        @keyframes pl-aura-a {
          0%,94%,100% { opacity: 0;    }
          12%,82%     { opacity: 0.55; }
          50%         { opacity: 0.7;  }
        }

        /* Speed lines — visible only during jump (62–74%) */
        .pl-spd {
          animation: pl-spdv 3s ease-in-out infinite;
        }
        @keyframes pl-spdv {
          0%,58%,77%,100% { opacity: 0;   }
          63%,72%         { opacity: 0.4; }
        }

        /* ═══ EARS ═══════════════════════════════════════════ */
        .pl-el { transform-box: fill-box; transform-origin: 50% 100%; animation: pl-eanl 3s ease-in-out infinite; }
        .pl-er { transform-box: fill-box; transform-origin: 50% 100%; animation: pl-eanr 3s ease-in-out infinite; }
        @keyframes pl-eanl {
          0%,28%,58%,100% { transform: rotate(0deg);   }
          36%             { transform: rotate(-22deg);  }
          45%             { transform: rotate(10deg);   }
          52%             { transform: rotate(-5deg);   }
          57%             { transform: rotate(0deg);    }
          65%             { transform: rotate(-16deg);  }
          73%             { transform: rotate(5deg);    }
          78%             { transform: rotate(0deg);    }
        }
        @keyframes pl-eanr {
          0%,28%,58%,100% { transform: rotate(0deg);  }
          36%             { transform: rotate(22deg);  }
          45%             { transform: rotate(-10deg); }
          52%             { transform: rotate(5deg);   }
          57%             { transform: rotate(0deg);   }
          65%             { transform: rotate(16deg);  }
          73%             { transform: rotate(-5deg);  }
          78%             { transform: rotate(0deg);   }
        }

        /* ═══ ARMS ═══════════════════════════════════════════ */
        .pl-al { transform-box: fill-box; transform-origin: 0% 0%;   animation: pl-aml 3s ease-in-out infinite; }
        .pl-ar { transform-box: fill-box; transform-origin: 100% 0%; animation: pl-amr 3s ease-in-out infinite; }
        @keyframes pl-aml {
          0%,32%  { transform: rotate(0deg);   }
          37%     { transform: rotate(-20deg); }
          52%     { transform: rotate(-12deg); }
          64%     { transform: rotate(-42deg); }
          73%     { transform: rotate(-4deg);  }
          80%,92% { transform: rotate(6deg);   }
          100%    { transform: rotate(0deg);   }
        }
        @keyframes pl-amr {
          0%,32%  { transform: rotate(0deg);  }
          37%     { transform: rotate(20deg); }
          52%     { transform: rotate(12deg); }
          64%     { transform: rotate(42deg); }
          73%     { transform: rotate(4deg);  }
          80%,92% { transform: rotate(-6deg); }
          100%    { transform: rotate(0deg);  }
        }

        /* ═══ FOOT TAP ═══════════════════════════════════════ */
        .pl-ft {
          animation: pl-fta 3s ease-in-out infinite;
        }
        @keyframes pl-fta {
          0%,76%,100% { transform: translateY(0);    }
          80%         { transform: translateY(-5px); }
          83%         { transform: translateY(0);    }
          87%         { transform: translateY(-3px); }
          90%         { transform: translateY(0);    }
        }

        /* ═══ EYES ═══════════════════════════════════════════ */
        /* Normal eyes — hidden during shock and happy */
        .pl-en { animation: pl-env 3s ease-in-out infinite; }
        @keyframes pl-env {
          0%,32%,56%,77%,93%,100% { opacity: 1; }
          36%,52%                  { opacity: 0; }
          80%,91%                  { opacity: 0; }
        }

        /* Per-eye blink scaleY */
        .pl-eb {
          transform-box: fill-box; transform-origin: 50% 50%;
          animation: pl-blnk 3s ease-in-out infinite;
        }
        @keyframes pl-blnk {
          0%,11%,15%,100% { transform: scaleY(1);    }
          13%             { transform: scaleY(0.05); }
        }

        /* Shocked eyes */
        .pl-esh { animation: pl-shv 3s ease-in-out infinite; }
        @keyframes pl-shv {
          0%,32%,56%,100% { opacity: 0; }
          36%,52%         { opacity: 1; }
        }

        /* Happy eyes */
        .pl-ehp { animation: pl-hpv 3s ease-in-out infinite; }
        @keyframes pl-hpv {
          0%,77%,92%,100% { opacity: 0; }
          81%,90%         { opacity: 1; }
        }

        /* ═══ MOUTH ══════════════════════════════════════════ */
        .pl-mn  { animation: pl-env 3s ease-in-out infinite; }
        .pl-msh { animation: pl-shv 3s ease-in-out infinite; }
        .pl-mhp { animation: pl-hpv 3s ease-in-out infinite; }

        /* ═══ HEADPHONES ═════════════════════════════════════ */
        .pl-hp {
          transform-box: fill-box; transform-origin: 50% 50%;
          animation: pl-hpa 3s cubic-bezier(0.34,1.56,0.64,1) infinite;
        }
        @keyframes pl-hpa {
          0%,75%          { opacity: 0; transform: scale(0.3) translateY(-12px); }
          81%             { opacity: 1; transform: scale(1.1) translateY(0);     }
          86%,90%         { opacity: 1; transform: scale(1)   translateY(0);     }
          94%,100%        { opacity: 0; transform: scale(0.3) translateY(-12px); }
        }

        /* ═══ MUSIC NOTES ════════════════════════════════════ */
        .pl-n1 { animation: pl-nt1 3s ease-out infinite 0.4s; }
        .pl-n2 { animation: pl-nt2 3s ease-out infinite 1.8s; }
        @keyframes pl-nt1 {
          0%   { transform: translate(0,0) rotate(0deg);          opacity: 0;   }
          12%  { opacity: 1;   }
          80%  { opacity: 0.55; }
          100% { transform: translate(-24px,-64px) rotate(-18deg); opacity: 0;  }
        }
        @keyframes pl-nt2 {
          0%   { transform: translate(0,0) rotate(0deg);          opacity: 0;   }
          12%  { opacity: 0.9; }
          80%  { opacity: 0.3;  }
          100% { transform: translate(20px,-56px) rotate(15deg);  opacity: 0;   }
        }

        /* ═══ BRAND ══════════════════════════════════════════ */
        .pl-brand {
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
        }

        .pl-title {
          margin: 0;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          font-size: clamp(30px, 9.5vmin, 44px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
          background: linear-gradient(120deg, #f472b6 0%, #c084fc 45%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pl-tglow 3s ease-in-out infinite;
        }
        @keyframes pl-tglow {
          0%,100% {
            filter: drop-shadow(0 0 10px rgba(244,114,182,0.35))
                    drop-shadow(0 0 20px rgba(167,139,250,0.2));
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(52,211,153,0.45))
                    drop-shadow(0 0 36px rgba(167,139,250,0.25));
          }
        }

        /* Progress bar */
        .pl-bar-track {
          width: clamp(120px, 40vmin, 170px);
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
          overflow: hidden;
        }
        .pl-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, #f472b6, #a78bfa 50%, #34d399);
          animation: pl-bar 3s linear infinite;
        }
        @keyframes pl-bar {
          0%   { width: 0%;   opacity: 1; }
          88%  { width: 100%; opacity: 1; }
          93%  { width: 100%; opacity: 0; }
          94%  { width: 0%;   opacity: 0; }
          100% { width: 0%;   opacity: 1; }
        }

        .pl-sub {
          margin: 0;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: clamp(9px, 2.5vmin, 11px);
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
        }
      `}</style>

      <div className="pl-root no-transition" role="status" aria-label="Loading Pandoos">

        {/* Aurora */}
        <div className="pl-aurora" />

        {/* ──────── SVG SCENE ──────── */}
        <svg
          className="pl-scene"
          viewBox="0 0 200 360"
          xmlns="http://www.w3.org/2000/svg"
          overflow="visible"
          aria-hidden="true"
        >
          <defs>
            {/* Panda body */}
            <radialGradient id="PLbody" cx="48%" cy="33%" r="58%">
              <stop offset="0%"   stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#eaeaf8"/>
            </radialGradient>
            {/* Eye patch */}
            <radialGradient id="PLpatch" cx="50%" cy="50%" r="52%">
              <stop offset="0%"   stopColor="#10102a"/>
              <stop offset="100%" stopColor="#08081a"/>
            </radialGradient>
            {/* Bamboo */}
            <linearGradient id="PLbam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#00e8a0"/>
              <stop offset="45%"  stopColor="#00cc88"/>
              <stop offset="100%" stopColor="#009060"/>
            </linearGradient>
            {/* Leaf */}
            <linearGradient id="PLleaf" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00f0a0"/>
              <stop offset="100%" stopColor="#005c38"/>
            </linearGradient>
            {/* Panda aura */}
            <radialGradient id="PLaura" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(0,210,150,0.25)"/>
              <stop offset="100%" stopColor="rgba(0,210,150,0)"/>
            </radialGradient>
            {/* Headphone */}
            <linearGradient id="PLhp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#f472b6"/>
              <stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
            {/* Drop shadow */}
            <filter id="PLshadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="5"
                floodColor="#000000" floodOpacity="0.38"/>
            </filter>
            {/* Bamboo glow bloom */}
            <filter id="PLglow" x="-80%" y="-20%" width="260%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
              <feColorMatrix in="b" type="matrix"
                values="0 0 0 0 0  0 0 0 0 0.85  0 0 0 0 0.6  0 0 0 0.5 0"
                result="c"/>
              <feMerge>
                <feMergeNode in="c"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Petal blur */}
            <filter id="PLpetal" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6"/>
            </filter>
          </defs>

          {/* ── Stars (opacity-only animation, no r) ── */}
          <g>
            <circle className="st" cx="12"  cy="15"  r="1.1" fill="white"   opacity="0.6"/>
            <circle className="st" cx="48"  cy="6"   r="0.8" fill="#bae6fd" opacity="0.5"/>
            <circle className="st" cx="180" cy="10"  r="1.0" fill="white"   opacity="0.7"/>
            <circle className="st" cx="192" cy="36"  r="0.7" fill="#e0f2fe" opacity="0.5"/>
            <circle className="st" cx="8"   cy="56"  r="0.9" fill="white"   opacity="0.6"/>
            <circle className="st" cx="194" cy="84"  r="1.1" fill="#bae6fd" opacity="0.6"/>
            <circle className="st" cx="22"  cy="106" r="0.7" fill="white"   opacity="0.4"/>
            <circle className="st" cx="188" cy="134" r="0.9" fill="#e0f2fe" opacity="0.5"/>
            <circle className="st" cx="5"   cy="158" r="1.0" fill="white"   opacity="0.7"/>
            <circle className="st" cx="197" cy="188" r="0.7" fill="white"   opacity="0.4"/>
          </g>

          {/* ── Background bamboo silhouettes ── */}
          <g opacity="0.1">
            <rect x="18"  y="80"  width="8" height="280" rx="4" fill="#00cc88"/>
            <rect x="174" y="65"  width="8" height="295" rx="4" fill="#00cc88"/>
            <rect x="30"  y="120" width="6" height="240" rx="3" fill="#00cc88"/>
            <rect x="162" y="105" width="6" height="255" rx="3" fill="#00cc88"/>
          </g>

          {/* ── Main bamboo ── */}
          <g className="pl-bam">
            <rect x="93" y="28" width="14" height="314" rx="7"
              fill="url(#PLbam)" filter="url(#PLglow)"/>
            {/* Nodes */}
            <rect x="88" y="92"  width="24" height="7" rx="3.5" fill="#009060"/>
            <rect x="88" y="157" width="24" height="7" rx="3.5" fill="#009060"/>
            <rect x="88" y="222" width="24" height="7" rx="3.5" fill="#009060"/>
            <rect x="88" y="287" width="24" height="7" rx="3.5" fill="#009060"/>
            {/* Top leaves */}
            <g className="pl-ll" transform="translate(66,42)">
              <ellipse cx="0" cy="0" rx="28" ry="10"
                fill="url(#PLleaf)" transform="rotate(-36)"
                filter="url(#PLglow)"/>
            </g>
            <g className="pl-lr" transform="translate(134,36)">
              <ellipse cx="0" cy="0" rx="26" ry="9"
                fill="url(#PLleaf)" transform="rotate(30)"
                filter="url(#PLglow)"/>
            </g>
            <ellipse cx="100" cy="30" rx="9" ry="5" fill="#00f0a0" opacity="0.6"/>
          </g>

          {/* ── Sakura petals ── */}
          <g transform="translate(100,188)">
            <g className="pl-p1" transform="translate(-50,10)">
              <path d="M0,-8 C3.5,-4 5,0 0,5.5 C-5,0 -3.5,-4 0,-8Z"
                fill="#fda4af" filter="url(#PLpetal)" opacity="0.9"/>
            </g>
            <g className="pl-p2" transform="translate(44,6)">
              <path d="M0,-7 C3,-3.5 4.5,0 0,5 C-4.5,0 -3,-3.5 0,-7Z"
                fill="#fbcfe8" filter="url(#PLpetal)" opacity="0.8"/>
            </g>
            <g className="pl-p3" transform="translate(-32,-6)">
              <path d="M0,-6 C2.5,-3 4,0 0,4.5 C-4,0 -2.5,-3 0,-6Z"
                fill="#fda4af" filter="url(#PLpetal)" opacity="0.7"/>
            </g>
            <g className="pl-p4" transform="translate(36,-2)">
              <path d="M0,-7 C3,-3.5 4.5,0 0,5 C-4.5,0 -3,-3.5 0,-7Z"
                fill="#f9a8d4" filter="url(#PLpetal)" opacity="0.75"/>
            </g>
          </g>

          {/* ── PANDA ──────────────────────────────────────────
               Outer <g>: positional anchor at bamboo bottom.
               Inner <g>: climb animation (translateY only).   */}
          <g transform="translate(100,290)">
            <g className="pl-panda">

              {/* Aura glow — behind everything */}
              <ellipse className="pl-aura-e"
                cx="0" cy="-18" rx="40" ry="46" fill="url(#PLaura)"/>

              {/* Speed lines — jump phase only */}
              <g className="pl-spd">
                <line x1="-52" y1="-30" x2="-28" y2="-25"
                  stroke="rgba(0,220,160,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="-50" y1="-12" x2="-27" y2="-9"
                  stroke="rgba(0,220,160,0.3)" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="-48" y1="5"   x2="-28" y2="5"
                  stroke="rgba(0,220,160,0.2)" strokeWidth="1.1" strokeLinecap="round"/>
                <line x1="52"  y1="-30" x2="28"  y2="-25"
                  stroke="rgba(0,220,160,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="50"  y1="-12" x2="27"  y2="-9"
                  stroke="rgba(0,220,160,0.3)" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="48"  y1="5"   x2="28"  y2="5"
                  stroke="rgba(0,220,160,0.2)" strokeWidth="1.1" strokeLinecap="round"/>
              </g>

              {/* Music notes */}
              <g className="pl-n1" transform="translate(-40,-4)">
                <ellipse cx="0" cy="7" rx="5.5" ry="4" fill="#34d399"/>
                <rect x="5" y="-13" width="2.2" height="20" rx="1.1" fill="#34d399"/>
                <rect x="5" y="-13" width="10" height="2.2" rx="1.1" fill="#34d399"/>
              </g>
              <g className="pl-n2" transform="translate(36,2)">
                <ellipse cx="0" cy="5.5" rx="4.5" ry="3.2" fill="#c084fc"/>
                <rect x="4" y="-9" width="1.8" height="14.5" rx="0.9" fill="#c084fc"/>
              </g>

              {/* Left arm */}
              <g className="pl-al">
                <path d="M -24 -4 Q -26 11 -10 13"
                  stroke="#0d0d22" strokeWidth="14" strokeLinecap="round" fill="none"/>
                <path d="M -24 -4 Q -26 11 -10 13"
                  stroke="#181830" strokeWidth="10" strokeLinecap="round" fill="none"/>
              </g>

              {/* Right arm */}
              <g className="pl-ar">
                <path d="M 24 -4 Q 26 11 10 13"
                  stroke="#0d0d22" strokeWidth="14" strokeLinecap="round" fill="none"/>
                <path d="M 24 -4 Q 26 11 10 13"
                  stroke="#181830" strokeWidth="10" strokeLinecap="round" fill="none"/>
              </g>

              {/* Body */}
              <ellipse cx="0" cy="9" rx="24" ry="27"
                fill="url(#PLbody)" filter="url(#PLshadow)"/>
              <ellipse cx="0" cy="11" rx="14" ry="16" fill="rgba(160,160,200,0.3)"/>

              {/* Right leg — foot taps */}
              <g className="pl-ft">
                <ellipse cx="13"  cy="32" rx="13" ry="8" fill="#0d0d22"/>
                <ellipse cx="13"  cy="30" rx="10" ry="6" fill="#161628"/>
              </g>
              {/* Left leg */}
              <ellipse cx="-13" cy="32" rx="13" ry="8" fill="#0d0d22"/>
              <ellipse cx="-13" cy="30" rx="10" ry="6" fill="#161628"/>

              {/* Head — anime proportions */}
              <circle cx="0" cy="-24" r="27"
                fill="url(#PLbody)" filter="url(#PLshadow)"/>

              {/* Left ear */}
              <g transform="translate(-22,-46)">
                <g className="pl-el">
                  <circle cx="0" cy="0" r="14" fill="#0d0d22"/>
                  <circle cx="0" cy="0" r="8"  fill="#1c0d22"/>
                </g>
              </g>

              {/* Right ear */}
              <g transform="translate(22,-46)">
                <g className="pl-er">
                  <circle cx="0" cy="0" r="14" fill="#0d0d22"/>
                  <circle cx="0" cy="0" r="8"  fill="#1c0d22"/>
                </g>
              </g>

              {/* Eye patches */}
              <ellipse cx="-10" cy="-26" rx="11.5" ry="12"
                fill="url(#PLpatch)" transform="rotate(-7,-10,-26)"/>
              <ellipse cx="10"  cy="-26" rx="11.5" ry="12"
                fill="url(#PLpatch)" transform="rotate(7,10,-26)"/>

              {/* Normal eyes — large anime style */}
              <g className="pl-en">
                <g className="pl-eb">
                  <ellipse cx="-10" cy="-27" rx="7.5" ry="9"   fill="white"/>
                  <ellipse cx="-10" cy="-27" rx="6"   ry="7.5" fill="#09091e"/>
                  <ellipse cx="-10" cy="-26" rx="5"   ry="6"   fill="#1e3a8a" opacity="0.2"/>
                  <circle  cx="-7"  cy="-31" r="2.5" fill="white"/>
                  <circle  cx="-13" cy="-24" r="1.2" fill="white" opacity="0.65"/>
                </g>
                <g className="pl-eb">
                  <ellipse cx="10"  cy="-27" rx="7.5" ry="9"   fill="white"/>
                  <ellipse cx="10"  cy="-27" rx="6"   ry="7.5" fill="#09091e"/>
                  <ellipse cx="10"  cy="-26" rx="5"   ry="6"   fill="#1e3a8a" opacity="0.2"/>
                  <circle  cx="13"  cy="-31" r="2.5" fill="white"/>
                  <circle  cx="7"   cy="-24" r="1.2" fill="white" opacity="0.65"/>
                </g>
              </g>

              {/* Shocked eyes */}
              <g className="pl-esh">
                <ellipse cx="-10" cy="-27" rx="8"   ry="9.5"  fill="white"/>
                <circle  cx="-10" cy="-27" r="3"   fill="#09091e"/>
                <circle  cx="-8"  cy="-29" r="1.5" fill="white"/>
                <ellipse cx="10"  cy="-27" rx="8"   ry="9.5"  fill="white"/>
                <circle  cx="10"  cy="-27" r="3"   fill="#09091e"/>
                <circle  cx="12"  cy="-29" r="1.5" fill="white"/>
              </g>

              {/* Happy eyes — anime squint */}
              <g className="pl-ehp">
                <path d="M -18 -28 Q -10 -16 -2 -28"
                  stroke="#09091e" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <path d="M 2 -28 Q 10 -16 18 -28"
                  stroke="#09091e" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </g>

              {/* Nose */}
              <ellipse cx="0" cy="-13" rx="4.5" ry="3" fill="#0d0d22"/>

              {/* Anime blush cheeks */}
              <ellipse cx="-20" cy="-17" rx="8" ry="4.5" fill="rgba(251,113,133,0.3)"/>
              <ellipse cx="20"  cy="-17" rx="8" ry="4.5" fill="rgba(251,113,133,0.3)"/>

              {/* Normal mouth */}
              <g className="pl-mn">
                <path d="M -5 -8 Q 0 -4 5 -8"
                  stroke="#50506a" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              </g>

              {/* Shocked mouth */}
              <g className="pl-msh">
                <ellipse cx="0" cy="-7" rx="3.5" ry="4.5"
                  fill="none" stroke="#50506a" strokeWidth="2"/>
              </g>

              {/* Happy mouth */}
              <g className="pl-mhp">
                <path d="M -8 -8 Q 0 -0.5 8 -8"
                  stroke="#50506a" strokeWidth="2.6" strokeLinecap="round" fill="none"/>
              </g>

              {/* Headphones — spring pop */}
              <g className="pl-hp">
                <path d="M -27 -40 Q -1 -64 27 -40"
                  stroke="url(#PLhp)" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                <circle cx="-28" cy="-38" r="10"  fill="#5b21b6"/>
                <circle cx="-28" cy="-38" r="6.5" fill="url(#PLhp)"/>
                <circle cx="-26" cy="-41" r="2"   fill="rgba(255,255,255,0.35)"/>
                <circle cx="28"  cy="-38" r="10"  fill="#5b21b6"/>
                <circle cx="28"  cy="-38" r="6.5" fill="url(#PLhp)"/>
                <circle cx="30"  cy="-41" r="2"   fill="rgba(255,255,255,0.35)"/>
              </g>

            </g>{/* .pl-panda */}
          </g>{/* anchor */}

        </svg>

        {/* ──────── BRAND ──────── */}
        <div className="pl-brand no-transition">
          <h1 className="pl-title">Pandoos</h1>
          <div className="pl-bar-track">
            <div className="pl-bar-fill"/>
          </div>
          <p className="pl-sub">Loading your vibe</p>
        </div>

      </div>
    </>
  );
}
