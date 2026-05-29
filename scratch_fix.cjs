const fs = require('fs');
const file = 'src/features/player/hooks/useAudioEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `            // Pre-check if the proxy can serve this video before setting src
            fetch(proxyUrl, { method: 'HEAD' }).then(headRes => {
              // 451 = permanently unavailable (ytdl broken / embedding blocked on all fronts)
              // Skip cleanly rather than showing a broken audio element
              if (headRes.status === 451 || headRes.status === 403) {
                console.warn('[AudioEngine] Proxy also unavailable (status', headRes.status, ') — skipping track');
                state.setIsLoading(false);
                setTimeout(state.nextTrack, 800);
                return;
              }
              a.src = proxyUrl;
              a.load();
              if (state.isPlaying) {
                a.play().catch(e => {
                  console.error('[AudioEngine] Proxy fallback play failed:', e);
                  setTimeout(state.nextTrack, 1500);
                });
              }
            }).catch(e => {
              console.error('[AudioEngine] HEAD pre-check failed:', e);
              setTimeout(state.nextTrack, 1500);
            });`;

const replace = `            // Instantly start loading via GET. If it fails (e.g. 451/500), 
            // the a.onerror or play().catch() handles the auto-skip.
            a.src = proxyUrl;
            a.load();
            if (state.isPlaying) {
              a.play().catch(e => {
                console.error('[AudioEngine] Proxy fallback play failed:', e);
                // Wait briefly before skipping to prevent rapid-fire skips
                setTimeout(state.nextTrack, 1500);
              });
            }`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync(file, code);
  console.log('Modified successfully');
} else {
  console.error('Target string not found');
}
