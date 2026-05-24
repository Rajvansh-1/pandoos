import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Query parameter "videoId" is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }

    const upNext = await ytmusic.getUpNexts(videoId);

    // Map to Track format
    const items = upNext.map((song: any) => ({
      id: { videoId: song.videoId },
      snippet: {
        title: song.title || song.name,
        channelTitle: song.artists?.[0]?.name || song.artist?.name || 'Unknown Artist',
        thumbnails: {
          high: { url: song.thumbnails?.[1]?.url || song.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` }
        },
        publishedAt: new Date().toISOString(),
        artistId: song.artists?.[0]?.artistId || song.artists?.[0]?.browseId || song.artist?.artistId || song.artist?.browseId || null,
        albumId: song.album?.albumId || song.album?.browseId || null,
      }
    })).filter((item: any) => item.id.videoId); // Ensure valid videoId

    return new Response(JSON.stringify({ items, cached: false }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=3600',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
