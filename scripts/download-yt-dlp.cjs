const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(__dirname, '..', 'bin');

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Map platform to yt-dlp release filename
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

const file = fs.createWriteStream(destPath);

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        if (process.platform !== 'win32') {
          fs.chmodSync(destPath, '755');
        }
        console.log(`Downloaded successfully to ${destPath}`);
      });
    }).on('error', (err) => {
      fs.unlinkSync(destPath);
      console.error(`Error downloading: ${err.message}`);
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      if (process.platform !== 'win32') {
        fs.chmodSync(destPath, '755');
      }
      console.log(`Downloaded successfully to ${destPath}`);
    });
  }
}).on('error', (err) => {
  fs.unlinkSync(destPath);
  console.error(`Error downloading: ${err.message}`);
});
