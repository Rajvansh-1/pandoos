import type { VercelRequest, VercelResponse } from '@vercel/node';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();

// Keep a persistent connection for consecutive hot invocations
let isInitialized = false;

// Fallback vibes if Gemini is missing or fails
const FALLBACK_VIBES = [
  { title: "Trending Bollywood Hits", query: "latest bollywood hits" },
  { title: "Focus & Flow Lofi", query: "lofi hip hop focus" },
  { title: "High Energy Workout", query: "gym motivation electronic" },
  { title: "Late Night Drive", query: "midnight synthwave" }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Crucial: Cache the response globally on Vercel Edge nodes for 6 hours!
  // This means Gemini is only hit 4 times a day, $0 cost, and zero latency for users.
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  
  try {
    if (!isInitialized) {
      await ytmusic.initialize();
      isInitialized = true;
    }

    let vibes = FALLBACK_VIBES;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are a master music curator. The current date/time is ${new Date().toISOString()}.
Generate 4 unique, hyper-specific and engaging 'vibe' playlists (e.g. 'Midnight Lofi Chill', 'Sunny Afternoon Acoustic', 'High Energy Workout Phonk', 'Bollywood Desi Beats').
For each, provide a catchy 'title' and a highly optimized 3-5 word 'query' that would return perfect results when searched on YouTube Music.
Return ONLY a valid JSON object in this exact structure:
{
  "vibes": [
    { "title": "...", "query": "..." }
  ]
}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
              response_mime_type: "application/json"
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.vibes && Array.isArray(parsed.vibes) && parsed.vibes.length > 0) {
              vibes = parsed.vibes;
            }
          }
        }
      } catch (err) {
        console.error('Gemini Oracle failed, using fallback vibes:', err);
      }
    }

    // Now execute the searches against YTMusic for the generated vibes
    const oraclePlaylists = await Promise.all(
      vibes.map(async (vibe) => {
        try {
          const songs = await ytmusic.searchSongs(vibe.query);
          
          const mappedTracks = songs.slice(0, 15).map(song => ({
            id: song.videoId,
            videoId: song.videoId,
            title: song.name,
            artist: song.artist?.name || 'Unknown Artist',
            thumbnail: song.thumbnails?.[1]?.url || song.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
            duration: song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : undefined,
            artistId: song.artist?.artistId || song.artist?.browseId || null,
            albumId: song.album?.albumId || song.album?.browseId || null,
          }));

          return {
            id: vibe.title.toLowerCase().replace(/\s+/g, '-'),
            title: vibe.title,
            query: vibe.query,
            songs: mappedTracks
          };
        } catch (e) {
          return null;
        }
      })
    );

    // Filter out any failed searches
    const validPlaylists = oraclePlaylists.filter(Boolean);

    res.status(200).json({ oracle: validPlaylists });
  } catch (error: any) {
    console.error('Oracle API Error:', error);
    res.status(500).json({ error: 'Failed to generate oracle vibes' });
  }
}
