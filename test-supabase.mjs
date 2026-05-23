import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLikedSongs() {
  console.log("Testing liked_songs table...");
  // Try to query it first
  const { data, error } = await supabase.from('liked_songs').select('*').limit(1);
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success:", data);
  }

  // Try to insert
  console.log("Testing insert into liked_songs...");
  const { error: insertError } = await supabase.from('liked_songs').upsert({
    user_id: 'test-user-id',
    video_id: 'test-video-id',
    title: 'Test Title',
    artist: 'Test Artist',
    album_art: 'test.jpg',
    duration: 180,
    liked_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error("Insert Error:", insertError);
  } else {
    console.log("Insert Success");
  }
}

testLikedSongs();
