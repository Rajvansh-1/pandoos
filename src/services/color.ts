interface ExtractedColors {
  primary: string;    // HSL without hsl() wrapper, e.g. "270 80% 68%"
  secondary: string;
  accent: string;
  muted: string;
}

/** Convert RGB (0-255) to an HSL string "H S% L%" for CSS var injection */
function rgbToHslString(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Provide fallback defaults using || to catch any NaN results from floating point math
  const H = Math.round((h || 0) * 360) % 360;
  // Force a vibrant saturation
  const S = Math.min(Math.round((s || 0) * 100) + 25, 95);
  // Strictly clamp lightness to ensure it NEVER goes black or white
  const L = Math.max(45, Math.min(65, Math.round((l || 0) * 100)));
  
  return `${H} ${S}% ${L}%`;
}

/**
 * Load an image into an offscreen canvas, sample pixels in a grid,
 * and return up to `k` dominant color clusters (k-means lite).
 *
 * This replaces node-vibrant which doesn't have a default export in Vite's
 * browser bundler and crashes the entire module graph with a SyntaxError.
 */
async function sampleImageColors(
  imageUrl: string,
  sampleSize = 200
): Promise<Array<[number, number, number]>> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const SIZE = 64; // downscale for speed
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([]); return; }

      // Crop to center 50% to avoid any black bars on top, bottom, or sides
      const sx = img.width * 0.25;
      const sy = img.height * 0.25;
      const sWidth = img.width * 0.5;
      const sHeight = img.height * 0.5;
      
      try {
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        const filteredPixels: Array<[number, number, number]> = [];
        const allPixels: Array<[number, number, number]> = [];
        const step = Math.max(1, Math.floor(data.length / 4 / sampleSize));

        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const a = data[i + 3] ?? 0;
          
          if (a < 128) continue;
          allPixels.push([r, g, b]);
          
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 240) continue; // Reject only very dark/bright pixels
          
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 15) continue; // Reject completely grey/unsaturated pixels
          
          filteredPixels.push([r, g, b]);
        }
        // Fallback to all pixels if the image is mostly dark/desaturated
        resolve(filteredPixels.length >= 5 ? filteredPixels : allPixels);
      } catch (e) {
        console.error("Canvas tainted or failed:", e);
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}

/** Find the most-saturated pixel cluster among sampled pixels */
function dominantColors(
  pixels: Array<[number, number, number]>
): { vibrant: [number,number,number] | null; muted: [number,number,number] | null } {
  if (pixels.length === 0) return { vibrant: null, muted: null };

  // Sort by saturation descending
  const withSat = pixels.map(([r, g, b]) => {
    const rN = r / 255, gN = g / 255, bN = b / 255;
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const sat = max === 0 ? 0 : (max - min) / max;
    return { r, g, b, sat };
  });
  withSat.sort((a, b) => b.sat - a.sat);

  const vibrant = withSat[0];
  const muted = withSat[Math.floor(withSat.length * 0.7)];

  return {
    vibrant: vibrant ? [vibrant.r, vibrant.g, vibrant.b] : null,
    muted: muted ? [muted.r, muted.g, muted.b] : null,
  };
}

/**
 * Generate a deterministic fallback palette based on videoId hash.
 * This guarantees the mood engine ALWAYS transitions even if CORS or
 * image extraction fails.
 */
function getFallbackColor(videoId: string): ExtractedColors {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    primary: `${hue} 80% 60%`,
    secondary: `${(hue + 30) % 360} 70% 65%`,
    accent: `${(hue + 180) % 360} 75% 60%`,
    muted: `${hue} 30% 25%`
  };
}

/**
 * Extract dominant, vibrant, and muted colors from an image URL using
 * the browser Canvas API — no external dependencies required.
 *
 * @param imageUrl - Any CORS-enabled URL (YouTube thumbnails work fine).
 * @param videoId - Fallback id to generate a deterministic color.
 * @returns Extracted palette.
 */
export async function extractColors(imageUrl: string, videoId: string): Promise<ExtractedColors> {
  try {
    const pixels = await sampleImageColors(imageUrl);
    if (pixels.length < 5) return getFallbackColor(videoId);

    const { vibrant, muted } = dominantColors(pixels);
    if (!vibrant) return getFallbackColor(videoId);

    const primary = rgbToHslString(...vibrant);

    // Derive secondary as a lighter/shifted variant
    const [ph] = primary.split(' ');
    const hue = parseInt(ph ?? '270', 10);
    const secondary = `${(hue + 30) % 360} 70% 65%`;
    const accent    = `${(hue + 180) % 360} 75% 60%`;
    const mutedStr  = muted
      ? rgbToHslString(...muted)
      : `${hue} 25% 55%`;

    return { primary, secondary, accent, muted: mutedStr };
  } catch {
    // Silently fail — use fallback color
    return getFallbackColor(videoId);
  }
}
