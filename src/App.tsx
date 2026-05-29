import React, { useEffect, useRef, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DesktopLayout } from '@/components/layout/DesktopLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useAudioEngine } from '@/features/player/hooks/useAudioEngine';
import { useRadioEngine } from '@/features/player/hooks/useRadioEngine';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useRecommendEngine } from '@/hooks/useRecommendEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { BadgeRevealModal } from '@/features/profile/BadgeRevealModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';
// Capacitor native hook disabled — PWA is the mobile strategy
// import { useCapacitorNative } from '@/hooks/useCapacitorNative';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { LevelUpConfetti } from '@/components/ui/LevelUpConfetti';
import { subscribeToLibraryChanges } from '@/services/syncService';
import { updateNowPlayingState, forceNowPlayingWrite, initNowPlayingSync } from '@/services/nowPlayingSync';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useQueryClient } from '@tanstack/react-query';

import { ToastContainer } from '@/components/ui/ToastContainer';
import { VolumeIndicator } from '@/components/ui/VolumeIndicator';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { ArtistOverlay } from '@/features/artist/components/ArtistOverlay';
import { AlbumOverlay } from '@/features/album/components/AlbumOverlay';
import { DownloadPage } from '@/pages/DownloadPage';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { DeviceTransferBanner } from '@/features/player/components/DeviceTransferBanner';

const HomePage = React.lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const SearchPage = React.lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const LibraryPage = React.lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PlaylistPage = React.lazy(() => import('@/pages/PlaylistPage').then(m => ({ default: m.PlaylistPage })));
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ErrorPage = React.lazy(() => import('@/pages/ErrorPage').then(m => ({ default: m.ErrorPage })));
const LegalPage = React.lazy(() => import('@/pages/LegalPage').then(m => ({ default: m.LegalPage })));

function RouteTracker() {
  useEffect(() => {
    const loader = document.getElementById('global-preloader');
    if (loader && !loader.dataset.removed) {
      loader.dataset.removed = 'true';
      loader.remove();
    }
  }, []);
  return null;
}

export function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const setSessionFromTokens = useAuthStore((state) => state.setSessionFromTokens);
  const awardBadge = useGamificationStore((state) => state.awardBadge);
  const earnedBadges = useGamificationStore((state) => state.earnedBadges);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const welcomeAwardedRef = useRef(false);

  const initOfflineStore = useOfflineStore((state) => state.initOfflineStore);
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const queryClient = useQueryClient();
  // useCapacitorNative(); // Disabled — Capacitor is no longer active

  // Player state for nowPlaying sync
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const progress = usePlayerStore((state) => state.progress);

  useAudioEngine();
  useRadioEngine();
  useMediaSession();
  useRecommendEngine();
  useKeyboardShortcuts();

  useEffect(() => {
    initializeAuth();
    initOfflineStore();
  }, [initializeAuth, initOfflineStore]);

  // Wire realtime library sync when user logs in
  useEffect(() => {
    if (user?.id) {
      subscribeToLibraryChanges(user.id, queryClient);
      initNowPlayingSync(user.id);
    }
  }, [user?.id, queryClient]);

  // ── Desktop Deep-Link OAuth Callback ───────────────────────────────────────
  // When the user completes Google sign-in in their system browser, the OS
  // hands the pandoos:// URL back to Electron, which sends it here via IPC.
  // We extract the access_token and refresh_token from the URL hash and
  // restore the Supabase session so the user is instantly logged in.
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onOAuthCallback) return; // Web — skip

    electronAPI.onOAuthCallback(async (callbackUrl: string) => {
      console.log('[App] OAuth deep-link callback received:', callbackUrl);
      try {
        // Supabase puts tokens in the URL hash: pandoos://login-callback#access_token=...&refresh_token=...
        // Use a dummy base URL so URL() can parse the fragment
        const hash = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await setSessionFromTokens(accessToken, refreshToken);
          console.log('[App] Desktop login successful via deep link!');
        } else {
          console.error('[App] OAuth callback missing tokens in URL:', callbackUrl);
        }
      } catch (err) {
        console.error('[App] Failed to set session from deep-link tokens:', err);
      }
    });

    // Cleanup on unmount
    return () => {
      electronAPI.removeOAuthCallback?.();
    };
  }, [setSessionFromTokens]);

  // Continuously update nowPlayingSync with latest player state
  useEffect(() => {
    updateNowPlayingState(currentTrack, isPlaying, progress);
  }, [currentTrack, isPlaying, progress]);

  // Instant sync write on play/pause or track skip
  useEffect(() => {
    if (user?.id && currentTrack) {
      forceNowPlayingWrite();
    }
  }, [currentTrack?.videoId, isPlaying, user?.id]);

  // Apply Theme to HTML root
  useEffect(() => {
    const html = document.documentElement;
    
    // Remove any existing theme classes
    html.classList.forEach((cls) => {
      if (cls.startsWith('theme-')) {
        html.classList.remove(cls);
      }
    });

    // Add new theme class if not dynamic
    if (activeTheme !== 'dynamic') {
      html.classList.add(`theme-${activeTheme}`);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (user && !welcomeAwardedRef.current && !earnedBadges.includes('welcome_panda')) {
      welcomeAwardedRef.current = true;
      setTimeout(() => awardBadge('welcome_panda'), 1500);
    }
    if (user) {
      welcomeAwardedRef.current = true;
    }
  }, [user, earnedBadges, awardBadge]);

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <Suspense fallback={null}>
        <RouteTracker />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={isMobile ? <MobileLayout /> : <DesktopLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/downloads" element={<DownloadPage />} />
            <Route path="*" element={<ErrorPage />} />
          </Route>
        </Routes>
      </Suspense>

      <OfflineIndicator />
      <LevelUpConfetti />
      <ToastContainer />
      <VolumeIndicator />
      
      {/* Dynamic Overlays */}
      <ArtistOverlay />
      <AlbumOverlay />

      <BadgeRevealModal />
      <OnboardingFlow />
      <PWAInstallPrompt />
      <DeviceTransferBanner />
    </>
  );
}

