import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useUIStore } from '@/stores/useUIStore';

// We will build DesktopPlayer and DesktopFullscreenPlayer next
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { FullscreenPlayer } from '@/features/player/components/FullscreenPlayer';
import { PandaChatModal } from '@/features/panda/components/PandaChatModal';
import { UpdateBanner } from '@/components/shared/UpdateBanner';

export function DesktopLayout() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isChatOpen = useUIStore((state) => state.isChatOpen);
  const closeChat = useUIStore((state) => state.closeChat);
  const chatInitialMessage = useUIStore((state) => state.chatInitialMessage);

  return (
    <div className="flex h-screen w-full bg-surface-base overflow-hidden relative">
      {/* Update notification — shows when electron-updater detects a new version */}
      <UpdateBanner />

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
        <div className="fixed bottom-6 left-[288px] right-6 z-[400] flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl pointer-events-auto">
            <MiniPlayer />
          </div>
        </div>
      )}

      {/* The Fullscreen Player overlays everything when active */}
      <FullscreenPlayer />

      {/* Global Panda Chat Modal */}
      <PandaChatModal
        isOpen={isChatOpen}
        onClose={closeChat}
        initialMessage={chatInitialMessage}
      />
    </div>
  );
}
