/**
 * isMobile.ts — Detect mobile/native environment at runtime.
 * Used to disable heavy Framer Motion animations that tank mobile perf.
 */

// Build-time native detection
export const IS_NATIVE = import.meta.env.VITE_IS_NATIVE === 'true';

// Runtime check for low-end or mobile devices
export const IS_MOBILE_BROWSER = typeof window !== 'undefined' &&
  /android|iphone|ipad|mobile/i.test(navigator.userAgent);

// True if we should reduce motion (native app OR user prefers reduced motion)
export const REDUCE_MOTION = IS_NATIVE || IS_MOBILE_BROWSER ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/**
 * Returns animation props for Framer Motion.
 * On mobile/native, disables enter animations entirely for 60fps scrolling.
 */
export function fadeIn(delay = 0) {
  if (REDUCE_MOTION) return {}; // No animation on mobile
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay },
  };
}

export function scaleIn() {
  if (REDUCE_MOTION) return {};
  return {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.2 },
  };
}
