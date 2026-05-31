const path = require('path');
const fs = require('fs');

async function test() {
  try {
    const { create } = require('youtube-dl-exec');
    const binaryPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
    console.log('Binary path:', binaryPath);
    console.log('Exists?', fs.existsSync(binaryPath));
    const ydl = create(binaryPath);
    
    console.log('Fetching url...');
    const result = await ydl('https://www.youtube.com/watch?v=SlbfAYvA_gI', {
      format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      getUrl: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:https://www.youtube.com/',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ],
    });
    
    console.log('Result:', result);
  } catch (e) {
    console.error('Error object:', e);
  }
}

test();
