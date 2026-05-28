import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Session } from '@supabase/supabase-js';
import type { PandoosUser } from '@/types/user';
import { supabase } from '@/services/supabase';
import { onUserLogin, unsubscribeFromLibraryChanges } from '@/services/syncService';
import { initNowPlayingSync, stopNowPlayingSync } from '@/services/nowPlayingSync';

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
  /** Google One Tap ID Token */
  signInWithGoogleIdToken: (token: string) => Promise<void>;
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
      try {
        // Wrap Supabase session check with a 5-second timeout.
        // On native Capacitor builds, Supabase might be slow or CORS-blocked,
        // which would leave the app stuck on the splash screen forever.
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        set((state) => {
          state.session = session;
          state.user = session ? sessionToUser(session) : null;
          state.isInitialized = true; // App can now render
        });

        // Listen for future auth changes (login, logout, token refresh)
        supabase.auth.onAuthStateChange((_event, newSession) => {
          set((state) => {
            state.session = newSession;
            state.user = newSession ? sessionToUser(newSession) : null;
          });

          if (newSession?.user) {
            // User just logged in — trigger cloud sync and realtime subscription
            onUserLogin(newSession.user.id).catch(console.warn);
            initNowPlayingSync(newSession.user.id);
          } else {
            // User logged out — stop sync
            unsubscribeFromLibraryChanges();
            stopNowPlayingSync();
          }
        });
      } catch (error) {
        // CRITICAL: Always mark as initialized even if Supabase fails
        // (e.g. network error, missing env vars in production build).
        // Without this, App.tsx returns null forever → blank screen.
        console.error('[Auth] Initialization failed, showing app without auth:', error);
        set((state) => {
          state.isInitialized = true;
        });
      }
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

    signInWithGoogleIdToken: async (token) => {
      set((state) => { state.isLoading = true; });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token,
      });
      set((state) => { state.isLoading = false; });
      if (error) throw error;
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
