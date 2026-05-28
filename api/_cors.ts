import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CORS origins allowed to call Pandoos API endpoints.
 *
 * - pandoos.vercel.app      → production web
 * - localhost:5173           → Vite dev server
 * - https://localhost        → Capacitor WebView on Android/iOS
 *                              (Capacitor serves the app at https://localhost)
 */
const ALLOWED_ORIGINS = [
  'https://pandoos.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://localhost',          // Capacitor Android/iOS WebView
  'capacitor://localhost',      // Capacitor iOS alternate origin
  'http://localhost',           // Capacitor Android alternate origin
];

/**
 * Apply CORS headers and handle preflight OPTIONS requests.
 * Returns true if the response was handled (OPTIONS preflight).
 * 
 * Usage at top of every handler:
 *   if (setCors(req, res)) return;
 */
export function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined;

  // Allow the specific origin if it's in the whitelist, otherwise allow all
  // (Capacitor WebView may not send an Origin header at all)
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback: allow any origin (safe since this is a music API with no PII writes)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Respond to CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
