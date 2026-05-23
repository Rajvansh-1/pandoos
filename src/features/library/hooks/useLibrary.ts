import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPlaylists,
  createPlaylist,
  deletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getLikedSongs,
  likeTrack,
  unlikeTrack,
  isTrackLiked
} from '@/services/library';
import { QUERY_KEYS } from '@/utils/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useToastStore } from '@/stores/useToastStore';
import type { Track } from '@/types/track';

// ── Playlists ─────────────────────────────────────────────────────────

export function usePlaylists() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';
  return useQuery({
    queryKey: QUERY_KEYS.playlists(userId),
    queryFn: () => getUserPlaylists(userId),
  });
}

export function usePlaylistTracks(playlistId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.playlist(playlistId),
    queryFn: () => getPlaylistTracks(playlistId),
    enabled: !!playlistId,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createPlaylist(userId, name, description),
    onMutate: async ({ name, description }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.playlists(userId) });
      const previousPlaylists = queryClient.getQueryData<any[]>(QUERY_KEYS.playlists(userId));
      
      const optimisticPlaylist = {
        id: Math.random().toString(36).substring(7),
        name,
        description: description || '',
        coverUrl: '',
        userId: userId,
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        trackCount: 0,
      };

      queryClient.setQueryData(QUERY_KEYS.playlists(userId), (old: any[] | undefined) => {
        return old ? [optimisticPlaylist, ...old] : [optimisticPlaylist];
      });

      return { previousPlaylists, optimisticId: optimisticPlaylist.id };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousPlaylists) {
        queryClient.setQueryData(QUERY_KEYS.playlists(userId), context.previousPlaylists);
      }
    },
    onSuccess: (newPlaylist, _, context) => {
      queryClient.setQueryData(QUERY_KEYS.playlists(userId), (old: any[] | undefined) => {
        if (!old) return [newPlaylist];
        return old.map((p) => p.id === context?.optimisticId ? newPlaylist : p);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists(userId) });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: (playlistId: string) => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists(userId) });
    },
  });
}

export function useAddTrackToPlaylist() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: ({ playlistId, track, position }: { playlistId: string; track: Track; position: number }) =>
      addTrackToPlaylist(playlistId, track, position),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists(userId) }); // Update trackCount in UI
    },
  });
}

export function useRemoveTrackFromPlaylist() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: ({ playlistId, videoId }: { playlistId: string; videoId: string }) =>
      removeTrackFromPlaylist(playlistId, videoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(variables.playlistId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists(userId) }); // Update trackCount in UI
    },
  });
}

// ── Liked Songs ───────────────────────────────────────────────────────

export function useLikedSongs() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';
  return useQuery({
    queryKey: QUERY_KEYS.likedSongs(userId),
    queryFn: () => getLikedSongs(userId),
  });
}

export function useIsTrackLiked(videoId: string) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || 'guest';
  return useQuery({
    queryKey: [...QUERY_KEYS.likedSongs(userId), 'check', videoId],
    queryFn: () => isTrackLiked(userId, videoId),
    enabled: !!videoId,
  });
}

export function useLikeTrack() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: (track: Track) => likeTrack(userId, track),
    onMutate: async (track) => {
      // Optimistic update
      const checkKey = [...QUERY_KEYS.likedSongs(userId), 'check', track.videoId];
      await queryClient.cancelQueries({ queryKey: checkKey });
      queryClient.setQueryData(checkKey, true);
    },
    onSuccess: () => {
      addToast('Added to Liked Songs', 'success');
    },
    onSettled: (_, __, track) => {
      useGamificationStore.getState().likeSong(track.videoId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likedSongs(userId) });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.likedSongs(userId), 'check', track.videoId] });
    },
  });
}

export function useUnlikeTrack() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const userId = user?.id || 'guest';

  return useMutation({
    mutationFn: (videoId: string) => unlikeTrack(userId, videoId),
    onMutate: async (videoId) => {
      // Optimistic update
      const checkKey = [...QUERY_KEYS.likedSongs(userId), 'check', videoId];
      await queryClient.cancelQueries({ queryKey: checkKey });
      queryClient.setQueryData(checkKey, false);
    },
    onSuccess: () => {
      addToast('Removed from Liked Songs', 'info');
    },
    onSettled: (_, __, videoId) => {
      useGamificationStore.getState().unlikeSong(videoId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likedSongs(userId) });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.likedSongs(userId), 'check', videoId] });
    },
  });
}
