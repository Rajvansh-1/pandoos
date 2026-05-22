import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YoutubeMusicApi from 'youtube-music-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current moodSeeds.ts file
const seedsFilePath = path.join(__dirname, 'src', 'data', 'moodSeeds.ts');
const fileContent = fs.readFileSync(seedsFilePath, 'utf-8');

// Regex to find all track entries: t('ID', 'Title', 'Artist')
const trackRegex = /t\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g;

async function healSeeds() {
  const api = new YoutubeMusicApi();
  await api.initalize();
  
  let newContent = fileContent;
  let match;
  
  // We need to do this sequentially to not spam the API
  const tracksToHeal = [];
  while ((match = trackRegex.exec(fileContent)) !== null) {
    tracksToHeal.push({
      fullMatch: match[0],
      oldId: match[1],
      title: match[2],
      artist: match[3],
      index: match.index
    });
  }

  console.log('Healing ' + tracksToHeal.length + ' tracks...');

  for (const track of tracksToHeal) {
    try {
      const query = track.title + ' ' + track.artist + ' audio lyrics';
      const result = await api.search(query, 'song');
      
      if (result && result.content && result.content.length > 0) {
        // Find a valid videoId that is different from the old broken one if possible
        let newId = result.content[0].videoId;
        if (newId === track.oldId && result.content.length > 1) {
           newId = result.content[1].videoId;
        }

        if (newId && newId !== track.oldId) {
          console.log('Fixed: ' + track.title + ' (' + track.oldId + ' -> ' + newId + ')');
          // Escape quotes for the replacement
          const safeTitle = track.title.replace(/'/g, "\\'");
          const safeArtist = track.artist.replace(/'/g, "\\'");
          const replacement = "t('" + newId + "', '" + safeTitle + "', '" + safeArtist + "')";
          newContent = newContent.replace(track.fullMatch, replacement);
        } else {
          console.log('Kept original for: ' + track.title);
        }
      }
    } catch (e) {
      console.error('Failed to heal: ' + track.title);
    }
  }

  fs.writeFileSync(seedsFilePath, newContent, 'utf-8');
  console.log('Successfully healed moodSeeds.ts!');
}

healSeeds();
