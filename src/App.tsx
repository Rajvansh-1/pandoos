import React, { useEffect, useRef, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DesktopLayout } from '@/components/layout/DesktopLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useAudioEngine } from '@/features/player/hooks/useAudioEngine';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useRecommendEngine } from '@/hooks/useRecommendEngine';
import { BadgeRevealModal } from '@/features/profile/BadgeRevealModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

const HomePage = React.lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const SearchPage = React.lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const LibraryPage = React.lazy(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));

export function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const awardBadge = useGamificationStore((state) => state.awardBadge);
  const earnedBadges = useGamificationStore((state) => state.earnedBadges);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Track if welcome badge was already awarded this session
  const welcomeAwardedRef = useRef(false);

  // Mount singleton hooks
  useAudioEngine();
  useMediaSession();
  useRecommendEngine();

  // Initialize Supabase session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Award welcome badge immediately on first login
  useEffect(() => {
    if (
      user &&
      !welcomeAwardedRef.current &&
      !earnedBadges.includes('welcome_panda')
    ) {
      welcomeAwardedRef.current = true;
      // Small delay so the app finishes rendering before showing the modal
      setTimeout(() => awardBadge('welcome_panda'), 1500);
    }
    if (user) {
      welcomeAwardedRef.current = true; // prevent re-award on hot reload
    }
  }, [user, earnedBadges, awardBadge]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-base flex-col gap-4">
        <img src="/logo.png" alt="Pandoos" className="w-16 h-16 object-contain animate-pulse" />
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-surface-base flex-col gap-4">
          <img src="/logo.png" alt="Pandoos" className="w-16 h-16 object-contain animate-pulse" />
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={isMobile ? <MobileLayout /> : <DesktopLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>

      <OfflineIndicator />
      {/* Global Badge Reveal Modal — renders on top of everything */}
      <BadgeRevealModal />
      <OnboardingFlow />
    </>
  );
}
