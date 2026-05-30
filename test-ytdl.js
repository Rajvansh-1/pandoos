import ytdl from '@distube/ytdl-core';

async function test() {
  try {
    const videoId = 'lR-q79a7n98';
    console.log('Fetching info using ytdl-core for', videoId);
    
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    
    console.log('Success! URL:', format.url);
  } catch (err) {
    console.error('ytdl-core error:', err.message);
  }
}

test();
