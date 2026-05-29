-- ============================================================
-- PANDOOS — MIGRATION SCRIPT
-- Safely adds missing columns and fixes realtime sync
-- ============================================================

-- 1. Safely add any missing columns to existing tables
ALTER TABLE liked_songs ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0;
ALTER TABLE liked_songs ADD COLUMN IF NOT EXISTS album_art text;

ALTER TABLE playlists ADD COLUMN IF NOT EXISTS track_count integer DEFAULT 0;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0;
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS album_art text;

ALTER TABLE followed_artists ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2. Safely recreate the Realtime publication to include ALL tables
-- This avoids the "already member" error by dropping and recreating it
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  liked_songs, 
  playlists, 
  playlist_tracks, 
  followed_artists, 
  now_playing, 
  listening_history, 
  user_taste_profile;
