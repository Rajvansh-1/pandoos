-- ============================================================
-- PANDOOS — COMPLETE BULLETPROOF DATABASE SETUP
-- This script safely creates all tables, adds missing columns,
-- and configures Realtime sync. It will NOT throw errors.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. LIKED SONGS
-- ────────────────────────────────────────────────────────────
create table if not exists liked_songs (
  id        uuid default gen_random_uuid() primary key,
  user_id   text not null,
  video_id  text not null,
  title     text not null,
  artist    text not null,
  album_art text,
  duration  integer default 0,
  liked_at  timestamp with time zone default timezone('utc', now()) not null,
  unique(user_id, video_id)
);
-- Add columns if they were missing from an older version
alter table liked_songs add column if not exists duration integer default 0;
alter table liked_songs add column if not exists album_art text;

create index if not exists liked_songs_user_id_idx on liked_songs(user_id, liked_at desc);
alter table liked_songs disable row level security;


-- ────────────────────────────────────────────────────────────
-- 2. PLAYLISTS
-- ────────────────────────────────────────────────────────────
create table if not exists playlists (
  id          uuid default gen_random_uuid() primary key,
  user_id     text not null,
  name        text not null,
  description text default '',
  cover_url   text,
  is_public   boolean default false,
  track_count integer default 0,
  created_at  timestamp with time zone default timezone('utc', now()) not null,
  updated_at  timestamp with time zone default timezone('utc', now()) not null
);
-- Add columns if they were missing from an older version
alter table playlists add column if not exists description text default '';
alter table playlists add column if not exists cover_url text;
alter table playlists add column if not exists is_public boolean default false;
alter table playlists add column if not exists track_count integer default 0;

create index if not exists playlists_user_id_idx on playlists(user_id, updated_at desc);
alter table playlists disable row level security;


-- ────────────────────────────────────────────────────────────
-- 3. PLAYLIST TRACKS
-- ────────────────────────────────────────────────────────────
create table if not exists playlist_tracks (
  id          uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade not null,
  video_id    text not null,
  title       text not null,
  artist      text not null,
  album_art   text,
  duration    integer default 0,
  position    bigint not null,
  added_at    timestamp with time zone default timezone('utc', now()) not null
);
-- Add columns if they were missing from an older version
alter table playlist_tracks add column if not exists duration integer default 0;
alter table playlist_tracks add column if not exists album_art text;

create index if not exists playlist_tracks_playlist_id_idx on playlist_tracks(playlist_id, position);
alter table playlist_tracks disable row level security;


-- Auto-update track_count on playlists when tracks are added/removed
create or replace function update_playlist_metadata()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update playlists set track_count = track_count + 1, updated_at = now() where id = NEW.playlist_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update playlists set track_count = greatest(track_count - 1, 0), updated_at = now() where id = OLD.playlist_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists on_playlist_track_added on playlist_tracks;
create trigger on_playlist_track_added
  after insert or delete on playlist_tracks
  for each row execute function update_playlist_metadata();


-- ────────────────────────────────────────────────────────────
-- 4. FOLLOWED ARTISTS
-- ────────────────────────────────────────────────────────────
create table if not exists followed_artists (
  id            uuid default gen_random_uuid() primary key,
  user_id       text not null,
  artist_id     text not null,
  name          text not null,
  thumbnail_url text,
  followed_at   timestamp with time zone default timezone('utc', now()) not null,
  unique(user_id, artist_id)
);
-- Add columns if they were missing from an older version
alter table followed_artists add column if not exists thumbnail_url text;

create index if not exists followed_artists_user_id_idx on followed_artists(user_id, followed_at desc);
alter table followed_artists disable row level security;


-- ────────────────────────────────────────────────────────────
-- 5. NOW PLAYING — Cross-Device Sync
-- ────────────────────────────────────────────────────────────
create table if not exists now_playing (
  user_id     text primary key,
  video_id    text,
  title       text,
  artist      text,
  album_art   text,
  is_playing  boolean default false,
  progress    float default 0,
  device_name text default 'Web',
  updated_at  timestamp with time zone default timezone('utc', now()) not null
);

alter table now_playing disable row level security;


-- ────────────────────────────────────────────────────────────
-- 6. LISTENING HISTORY
-- ────────────────────────────────────────────────────────────
create table if not exists listening_history (
  id         uuid default gen_random_uuid() primary key,
  user_id    text not null,
  video_id   text not null,
  title      text not null,
  artist     text not null,
  album_art  text,
  duration   integer default 0,
  listen_pct float default 0,
  skipped    boolean default false,
  mood_tag   text,
  hour_of_day integer,
  day_of_week integer,
  listened_at timestamp with time zone default timezone('utc', now()) not null
);

create index if not exists listening_history_user_id_idx on listening_history(user_id, listened_at desc);
alter table listening_history disable row level security;


-- ────────────────────────────────────────────────────────────
-- 7. USER TASTE PROFILE
-- ────────────────────────────────────────────────────────────
create table if not exists user_taste_profile (
  user_id        text primary key,
  top_genres     text[] default '{}',
  top_artists    text[] default '{}',
  top_moods      text[] default '{}',
  avg_energy     float default 0.5,
  preferred_lang text default 'mixed',
  listen_count   integer default 0,
  updated_at     timestamp with time zone default timezone('utc', now()) not null
);

alter table user_taste_profile disable row level security;


-- ────────────────────────────────────────────────────────────
-- 8. ENABLE REALTIME (cross-device sync)
-- Drop the publication first to avoid any "already member" errors
-- ────────────────────────────────────────────────────────────
drop publication if exists supabase_realtime;
create publication supabase_realtime for table 
  liked_songs, 
  playlists, 
  playlist_tracks, 
  followed_artists, 
  now_playing, 
  listening_history, 
  user_taste_profile;
