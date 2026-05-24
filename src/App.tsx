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
import { MobileLayout } from '@/components/layout/MobileLayout';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

import { ToastContainer } from '@/components/ui/ToastContainer';
import { VolumeIndicator } from '@/components/ui/VolumeIndicator';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

const HomePage = React.lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const SearchPage = React.lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const LibraryPage = React.lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PlaylistPage = React.lazy(() => import('@/pages/PlaylistPage').then(m => ({ default: m.PlaylistPage })));
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ErrorPage = React.lazy(() => import('@/pages/ErrorPage').then(m => ({ default: m.ErrorPage })));

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
  const awardBadge = useGamificationStore((state) => state.awardBadge);
  const earnedBadges = useGamificationStore((state) => state.earnedBadges);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const welcomeAwardedRef = useRef(false);

  useAudioEngine();
  useRadioEngine();
  useMediaSession();
  useRecommendEngine();
  useKeyboardShortcuts();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
            {/* Catch-all */}
            <Route path="*" element={<ErrorPage />} />
          </Route>
        </Routes>
      </Suspense>

      <OfflineIndicator />
      <ToastContainer />
      <VolumeIndicator />
      {/* Global Badge Reveal Modal — renders on top of everything */}
      <BadgeRevealModal />
      <OnboardingFlow />
    </>
  );
}
