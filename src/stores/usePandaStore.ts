import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Track } from '@/types/track';

export interface PandaMessage {
  id: string;
  sender: 'user' | 'panda';
  text: string;
  isAction?: boolean;
  trackPayload?: Track; // Used for rendering the rich UI card
  playlistPayload?: Track[]; // Used for queueing up next songs
  artistPayload?: { artistId: string; name: string; thumbnails?: { url: string }[] };
  actionType?: 'play' | 'navigate' | 'artist';
}

interface PandaState {
  messages: PandaMessage[];
  isOpen: boolean;
}

interface PandaActions {
  addMessage: (msg: Omit<PandaMessage, 'id'>) => void;
  clearHistory: () => void;
  openChat: () => void;
  closeChat: () => void;
}

type PandaStore = PandaState & PandaActions;

export const usePandaStore = create<PandaStore>()(
  persist(
    immer((set) => ({
      messages: [
        {
          id: '1',
          sender: 'panda',
          text: "Hey! I'm Pandoo. Tell me how you're feeling or what you want to hear, and I'll find the perfect tracks for you!"
        }
      ],
      isOpen: false,

      addMessage(msg) {
        set((state) => {
          state.messages.push({ ...msg, id: Date.now().toString() + Math.random().toString() });
        });
      },

      clearHistory() {
        set((state) => {
          state.messages = [
            {
              id: Date.now().toString(),
              sender: 'panda',
              text: "Memory wiped! 🍃 A fresh bamboo forest awaits. What do you want to hear?"
            }
          ];
        });
      },

      openChat() {
        set((state) => {
          state.isOpen = true;
        });
      },

      closeChat() {
        set((state) => {
          state.isOpen = false;
        });
      }
    })),
    {
      name: 'pandoos-chat-v1',
    }
  )
);
