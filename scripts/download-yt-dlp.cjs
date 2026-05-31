const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const binDir = path.join(__dirname, '..', 'bin');

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const getFilename = () => {
  const platform = process.platform;
  if (platform === 'win32') return 'yt-dlp.exe';
  if (platform === 'darwin') return 'yt-dlp_macos';
  return 'yt-dlp'; // linux
};

const filename = getFilename();
const destPath = path.join(binDir, filename);
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${filename}`;

console.log(`Downloading ${filename} from ${url}...`);

async function download() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    
    // fetch's body is a Web stream. We can use Readable.fromWeb in Node 18+
    const { Readable } = require('stream');
    const fileStream = fs.createWriteStream(destPath);
    
    await pipeline(Readable.fromWeb(response.body), fileStream);
    
    if (process.platform !== 'win32') {
      fs.chmodSync(destPath, '755');
    }
    console.log(`Downloaded successfully to ${destPath}`);
  } catch (err) {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    console.error(`Error downloading: ${err.message}`);
    process.exit(1);
  }
}

download();
