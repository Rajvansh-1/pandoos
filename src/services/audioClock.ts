/**
 * audioClock.ts — Zero-latency shared audio time source.
 *
 * Architecture:
 *   The audio engine (useAudioEngine.ts) runs a requestAnimationFrame loop
 *   that reads getCurrentTime() directly from the YouTube IFrame player and
 *   writes the result here at ≤16ms resolution.
 *
 *   Consumers (e.g. LyricsView) read `audioClock.currentTimeMs` inside their
 *   own rAF loops. Because both sides use rAF, and there is NO React state or
 *   Zustand involved, the latency is effectively <1 frame (~16ms at 60fps) —
 *   vs. the 200-500ms lag from the 500ms setInterval + Zustand dispatch path.
 *
 * Usage:
 *   // Writer (audio engine):
 *   audioClock.currentTimeMs = player.getCurrentTime() * 1000;
 *
 *   // Reader (LyricsView):
 *   const ms = audioClock.currentTimeMs;
 */
const audioClock = {
  /** Playback position in milliseconds. Updated every animation frame by useAudioEngine. */
  currentTimeMs: 0,
  /** Whether the player is currently playing. Used to pause the lyrics rAF when idle. */
  isPlaying: false,
};

export default audioClock;
