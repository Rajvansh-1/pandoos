import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { usePlayerStore } from '@/stores/usePlayerStore';

// We will build DesktopPlayer and DesktopFullscreenPlayer next
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { FullscreenPlayer } from '@/features/player/components/FullscreenPlayer';

export function DesktopLayout() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  return (
    <div className="flex h-screen w-full bg-surface-base overflow-hidden relative">
      {/* Aurora Background covering the whole app */}
      <div className="fixed inset-0 mood-bg -z-20 pointer-events-none" />

      {/* Left Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      {/* It needs to scroll independently and have padding at the bottom for the player */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scroll-container pb-[100px] relative z-10">
        <Outlet />
      </main>

      {/* Persistent Bottom Player */}
      {currentTrack && (
        <div className="fixed bottom-6 left-[288px] right-6 z-40 flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto">
            <MiniPlayer />
          </div>
        </div>
      )}

      {/* The Fullscreen Player overlays everything when active */}
      <FullscreenPlayer />
    </div>
  );
}
