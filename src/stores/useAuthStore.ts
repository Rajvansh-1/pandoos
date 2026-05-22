import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Session } from '@supabase/supabase-js';
import type { PandoosUser } from '@/types/user';
import { supabase } from '@/services/supabase';

interface AuthStoreState {
  user: PandoosUser | null;
  session: Session | null;
  isLoading: boolean;
  /** True after the first Supabase session check completes.
   *  Components should show a loading spinner until this is true. */
  isInitialized: boolean;
}

interface AuthStoreActions {
  /**
   * Initialize by loading the current Supabase session.
   * Called once at app startup in App.tsx.
   */
  initialize: () => Promise<void>;
  /** Magic link email sign-in */
  signInWithEmail: (email: string) => Promise<void>;
  /** Google OAuth */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Internal: called by Supabase auth state listener */
  _setSession: (session: Session | null) => void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

function sessionToUser(session: Session): PandoosUser {
  const { user } = session;
  return {
    id: user.id,
    email: user.email ?? '',
    // Use display_name → email prefix as fallback username
    username: (user.user_metadata as { full_name?: string })?.full_name
      ?? user.email?.split('@')[0]
      ?? 'Panda',
    avatarUrl: (user.user_metadata as { avatar_url?: string })?.avatar_url ?? null,
    createdAt: user.created_at,
  };
}

/**
 * useAuthStore — Supabase session management.
 *
 * Architecture: This store is initialized once (App.tsx → store.initialize()).
 * It subscribes to Supabase's onAuthStateChange to stay in sync automatically.
 * No React Context needed — any component reads from this store directly.
 */
export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    user: null,
    session: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
      // Load existing session (e.g., user refreshes the page)
      const { data: { session } } = await supabase.auth.getSession();

      set((state) => {
        state.session = session;
        state.user = session ? sessionToUser(session) : null;
        state.isInitialized = true;
      });

      // Listen for future auth changes (login, logout, token refresh)
      supabase.auth.onAuthStateChange((_event, newSession) => {
        set((state) => {
          state.session = newSession;
          state.user = newSession ? sessionToUser(newSession) : null;
        });
      });
    },

    signInWithEmail: async (email) => {
      set((state) => { state.isLoading = true; });
      
      let redirectUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_VERCEL_URL || window.location.origin;
      redirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://${redirectUrl}`;
      redirectUrl = redirectUrl.endsWith('/') ? redirectUrl : `${redirectUrl}/`;
      const loginRedirectUrl = `${redirectUrl}login`;

      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: loginRedirectUrl },
      });
      set((state) => { state.isLoading = false; });
    },

    signInWithGoogle: async () => {
      set((state) => { state.isLoading = true; });
      
      let redirectUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_VERCEL_URL || window.location.origin;
      redirectUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://${redirectUrl}`;
      redirectUrl = redirectUrl.endsWith('/') ? redirectUrl : `${redirectUrl}/`;
      const loginRedirectUrl = `${redirectUrl}login`;

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: loginRedirectUrl },
      });
      // isLoading will be reset by onAuthStateChange callback
    },

    signOut: async () => {
      await supabase.auth.signOut();
      set((state) => {
        state.user = null;
        state.session = null;
      });
    },

    _setSession: (session) => {
      set((state) => {
        state.session = session;
        state.user = session ? sessionToUser(session) : null;
      });
    },
  }))
);
