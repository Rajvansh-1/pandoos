import { supabase } from '@/services/supabase';
import type { Track } from '@/types/track';
import { useTasteStore } from '@/stores/useTasteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { inferTags } from '@/services/trackGraph';

export interface PandoosSection {
  id: string;
  title: string;
  emoji: string;
  query: string;
  description: string;
}

/**
 * PANDOOS BRAIN
 * Generates dynamic home page sections based on user context.
 */
export class PandoosBrain {
  
  /**
   * Generates sections dynamically based on hour, weather (dummy), and taste.
   */
  static generateSections(): PandoosSection[] {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 18;
    const isEvening = hour >= 18 && hour < 22;
    const isNight = hour >= 22 || hour < 5;

    const topGenres = useTasteStore.getState().topGenres;
    const topArtists = useTasteStore.getState().topArtists;
    const recentArtists = useTasteStore.getState().recentArtists;

    const sections: PandoosSection[] = [];

    // 1. Time-based Section
    if (isMorning) {
      sections.push({
        id: 'time_morning',
        title: 'Morning Energy',
        emoji: '🌅',
        query: topGenres[0] ? `${topGenres[0]} morning acoustic happy` : 'morning acoustic chill pop',
        description: 'Start your day right',
      });
    } else if (isAfternoon) {
      sections.push({
        id: 'time_afternoon',
        title: 'Afternoon Focus',
        emoji: '☕',
        query: topGenres[0] ? `${topGenres[0]} focus chill` : 'lofi chill study focus',
        description: 'Keep the momentum going',
      });
    } else if (isEvening) {
      sections.push({
        id: 'time_evening',
        title: 'Evening Vibes',
        emoji: '🌆',
        query: topGenres[1] ? `${topGenres[1]} evening chill` : 'chill pop r&b relaxing',
        description: 'Wind down and relax',
      });
    } else if (isNight) {
      sections.push({
        id: 'time_night',
        title: 'Late Night Drive',
        emoji: '🌙',
        query: topGenres[0] ? `${topGenres[0]} night drive synthwave` : 'synthwave lofi night drive',
        description: 'Vibes for the midnight hour',
      });
    }

    // 2. Taste-based Sections
    if (topArtists.length > 0) {
      sections.push({
        id: 'taste_artist_1',
        title: `More like ${topArtists[0]}`,
        emoji: '🎸',
        query: `${topArtists[0]} similar artists best songs`,
        description: 'Because you love them',
      });
    }

    if (recentArtists.length > 0) {
      const recent = recentArtists[Math.floor(Math.random() * recentArtists.length)];
      sections.push({
        id: 'taste_recent',
        title: `Since you played ${recent}`,
        emoji: '🎧',
        query: `${recent} top hits`,
        description: 'Rediscover recent favorites',
      });
    }

    if (topGenres.length > 0) {
      sections.push({
        id: 'taste_genre_1',
        title: `Your ${topGenres[0]} Mix`,
        emoji: '🔥',
        query: `${topGenres[0]} top hits ${new Date().getFullYear()}`,
        description: 'The best of your favorite genre',
      });
    }

    // 3. Discovery Sections (Always include a few wildcards)
    sections.push({
      id: 'discover_global',
      title: 'Global Top Hits',
      emoji: '🌍',
      query: 'global top 50 hits popular',
      description: 'What the world is listening to',
    });

    sections.push({
      id: 'discover_viral',
      title: 'Viral Trends',
      emoji: '📈',
      query: 'viral hits tiktok trending',
      description: 'Songs blowing up right now',
    });

    return sections;
  }

  /**
   * Records a listen event to the `listening_history` table in Supabase.
   */
  static async recordListenEvent(track: Track, listenSecs: number, skipped: boolean) {
    const user = useAuthStore.getState().user;
    if (!user) return; // Only log for authenticated users

    const duration = track.duration || 1;
    const listenPct = Math.min(listenSecs / duration, 1.0);
    const date = new Date();

    try {
      await supabase.from('listening_history').insert({
        user_id: user.id,
        video_id: track.videoId,
        title: track.title,
        artist: track.artist,
        album_art: track.albumArt,
        duration: track.duration,
        listen_pct: listenPct,
        skipped: skipped,
        hour_of_day: date.getHours(),
        day_of_week: date.getDay(),
      });
    } catch (err) {
      console.error('[PandoosBrain] Failed to log listen event:', err);
    }
  }

  /**
   * Syncs the local TasteStore to the `user_taste_profile` table in Supabase.
   */
  static async syncTasteProfileToCloud() {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const state = useTasteStore.getState();
    const listenCount = Object.values(state.artistAffinity).reduce((a, b) => a + b, 0);

    try {
      await supabase.from('user_taste_profile').upsert({
        user_id: user.id,
        top_genres: state.topGenres,
        top_artists: state.topArtists,
        top_moods: state.moodHistory.slice(0, 5),
        avg_energy: 0.5, // Could compute this from tracks if needed
        preferred_lang: 'mixed',
        listen_count: listenCount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[PandoosBrain] Failed to sync taste profile:', err);
    }
  }
}
