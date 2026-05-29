const fs = require('fs');
const file = 'src/features/player/hooks/useAudioEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const startIdx = code.indexOf("fetch(proxyUrl, { method: 'HEAD' })");
if (startIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const catchStr = "setTimeout(state.nextTrack, 1500);\r\n            });";
let endIdx = code.indexOf(catchStr, startIdx);
if (endIdx === -1) {
  const altCatchStr = "setTimeout(state.nextTrack, 1500);\n            });";
  endIdx = code.indexOf(altCatchStr, startIdx);
  if (endIdx !== -1) {
    endIdx += altCatchStr.length;
  }
} else {
  endIdx += catchStr.length;
}

if (endIdx === -1) {
  console.log('End not found');
  process.exit(1);
}

const replace = `// Instantly start loading via GET. If it fails (e.g. 451/500), 
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

code = code.substring(0, startIdx) + replace + code.substring(endIdx);
fs.writeFileSync(file, code);
console.log('Modified successfully');
