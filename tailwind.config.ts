import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Tailwind config uses CSS variables for dynamic theming.
// This allows the Mood Engine to swap colors at runtime without re-compiling.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // All brand colors are driven by CSS variables so the Mood Engine
      // can mutate them at 60fps without class toggling overhead.
      colors: {
        brand: {
          primary: 'hsl(var(--color-primary) / <alpha-value>)',
          secondary: 'hsl(var(--color-secondary) / <alpha-value>)',
          accent: 'hsl(var(--color-accent) / <alpha-value>)',
          muted: 'hsl(var(--color-muted) / <alpha-value>)',
        },
        surface: {
          base: 'hsl(var(--surface-base) / <alpha-value>)',
          elevated: 'hsl(var(--surface-elevated) / <alpha-value>)',
          overlay: 'hsl(var(--surface-overlay) / <alpha-value>)',
        },
        text: {
          primary: 'hsl(var(--text-primary) / <alpha-value>)',
          secondary: 'hsl(var(--text-secondary) / <alpha-value>)',
          muted: 'hsl(var(--text-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Outfit"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backgroundImage: {
        // Dynamic gradients driven by CSS vars from the Mood Engine
        'mood-gradient': 'linear-gradient(135deg, hsl(var(--color-primary) / 0.3), hsl(var(--color-secondary) / 0.2), hsl(var(--color-accent) / 0.15))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        'vinyl-shine': 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glow-sm': '0 0 15px hsl(var(--color-primary) / 0.4)',
        'glow-md': '0 0 30px hsl(var(--color-primary) / 0.5)',
        'glow-lg': '0 0 60px hsl(var(--color-primary) / 0.4)',
        'vinyl': '0 25px 60px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [typography],
};

export default config;
