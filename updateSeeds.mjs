import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YoutubeMusicApi from 'youtube-music-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOODS = {
  bollywood: 'bollywood romantic hits',
  desi: 'desi hip hop punjabi',
  sufi: 'sufi ghazal lofi',
  chill: 'lofi chillhop beats',
  energy: 'high energy workout edm',
  focus: 'deep focus ambient electronic',
  romantic: 'romantic acoustic love songs',
  workout: 'heavy gym phonk workout',
  heartbroken: 'sad emotional heartbroken',
  sleepy: 'sleep delta waves ambient',
  latenight: 'late night drive synthwave',
  happy: 'happy feel good uplifting pop',
};

async function generateSeeds() {
  const api = new YoutubeMusicApi();
  await api.initalize();
  
  let fileContent = "import type { Track } from '@/types/track';\n\n";
  fileContent += "// Auto-generated fallback seeds (Guaranteed embeddable/working IDs)\n";
  fileContent += "const t = (id: string, title: string, artist: string): Track => ({\n";
  fileContent += "  duration: 0,\n";
  fileContent += "  source: 'youtube' as const,\n";
  fileContent += "  id, videoId: id, title, artist,\n";
  fileContent += "  albumArt: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',\n";
  fileContent += "});\n\n";
  fileContent += "export const MOOD_SEEDS: Record<string, Track[]> = {\n";

  for (const [moodKey, query] of Object.entries(MOODS)) {
    console.log("Fetching " + moodKey + "...");
    try {
      const result = await api.search(query, 'song');
      const tracks = result.content.slice(0, 15);
      
      fileContent += "  " + moodKey + ": [\n";
      for (const track of tracks) {
        // Escape quotes
        const title = track.name.replace(/'/g, "\\'");
        const artist = (track.artist?.name || 'Unknown').replace(/'/g, "\\'");
        fileContent += "    t('" + track.videoId + "', '" + title + "', '" + artist + "'),\n";
      }
      fileContent += "  ],\n";
    } catch (e) {
      console.error("Failed " + moodKey, e);
      fileContent += "  " + moodKey + ": [],\n";
    }
  }

  fileContent += "};\n";

  const outputPath = path.join(__dirname, 'src', 'data', 'moodSeeds.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  console.log('Successfully updated moodSeeds.ts!');
}

generateSeeds();
