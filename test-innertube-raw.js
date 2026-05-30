const videoId = 'lR-q79a7n98'; // The one that failed in screenshot

async function getStreamUrl(videoId) {
  const payload = {
    context: {
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'en',
        gl: 'IN'
      }
    },
    videoId: videoId
  };

  try {
    const res = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.playabilityStatus?.status !== 'OK') {
      console.log('Playability Status:', data.playabilityStatus);
    }

    const formats = data.streamingData?.adaptiveFormats || [];
    const audioFormats = formats.filter(f => f.mimeType.includes('audio/mp4') || f.mimeType.includes('audio/webm'));
    
    // Sort by bitrate descending
    audioFormats.sort((a, b) => b.bitrate - a.bitrate);
    
    if (audioFormats.length > 0) {
      console.log('Success! Stream URL:', audioFormats[0].url);
      return audioFormats[0].url;
    } else {
      console.log('No audio formats found in streamingData');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

getStreamUrl(videoId);
