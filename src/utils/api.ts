/**
 * getApiUrl — Cross-platform API URL resolver.
 *
 * The key insight: we cannot rely on window.Capacitor.isNative at runtime
 * because the Capacitor bridge may not be initialized when this code runs.
 * Instead, we use a build-time environment variable (VITE_IS_NATIVE=true)
 * that is baked into the bundle at compile time by Vite.
 *
 * Build targets:
 *   - Native (Android/iOS): VITE_IS_NATIVE=true → routes to https://pandoos.vercel.app
 *   - Desktop (Electron):   Uses electronAPI or falls back to vercel
 *   - Web browser:          Uses relative paths (Vite dev proxy handles it)
 */

// This constant is resolved at BUILD TIME by Vite — it becomes literally `true` or `false` in the bundle.
const IS_NATIVE_BUILD = import.meta.env.VITE_IS_NATIVE === 'true';

// Explicit override (useful for local testing)
const EXPLICIT_API_URL = import.meta.env.VITE_API_URL as string | undefined;

export function getApiUrl(path: string): string {
  // 1. Explicit override via env var
  if (EXPLICIT_API_URL) {
    return `${EXPLICIT_API_URL}${path}`;
  }

  // 2. Native Capacitor build (Android/iOS) — BAKED IN AT BUILD TIME, not runtime
  if (IS_NATIVE_BUILD) {
    return `https://pandoos.vercel.app${path}`;
  }

  // 3. Electron Desktop — runtime check is safe here since file:// is a unique protocol
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const electronApiUrl = (window as any).electronAPI?.getApiUrl?.();
    if (electronApiUrl) return `${electronApiUrl}${path}`;
    // Electron fallback: use Vercel
    return `https://pandoos.vercel.app${path}`;
  }

  // 4. Web browser — relative path (Vite dev proxy in dev, Vercel routing in production)
  return path;
}
