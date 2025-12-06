import { getSession, onAuthStateChange, signInWithGoogle, signOut } from '@/services/supabase/auth';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { logError, logWarn } from '@/utils/logger';
import * as Network from 'expo-network';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  checkSession: (skipIfOffline?: boolean) => Promise<void>;
  login: () => Promise<{ error: Error | null }>;
  logout: () => Promise<{ error: Error | null }>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    // Just set up auth state change listener, don't check session yet
    // Session will be checked when network is available via checkSession
    set({ isLoading: false });
    
    // Listen to auth state changes
    onAuthStateChange((event, session) => {
      set({
        user: session?.user ?? null,
        session: session,
        isAuthenticated: !!session,
      });
    });
  },

  checkSession: async (skipIfOffline = true) => {
    // Check network first if skipIfOffline is true
    if (skipIfOffline) {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const isNetworkAvailable = networkState.isConnected && networkState.isInternetReachable !== false;
        
        if (!isNetworkAvailable) {
          logWarn('Network not available, skipping session check');
          set({ isLoading: false });
          return;
        }
      } catch (error) {
        logWarn('Failed to check network status, skipping session check');
        set({ isLoading: false });
        return;
      }
    }

    set({ isLoading: true });
    try {
      const { session, error } = await getSession();
      
      if (error) {
        // Only log if it's not a timeout (which is expected when offline)
        if (!error.message.includes("timed out")) {
          logError('Error checking session:', error);
        }
        // If there's an error, clear the session (it might be expired)
        set({ 
          user: null, 
          session: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return;
      }

      // Update session state
      set({
        user: session?.user ?? null,
        session: session,
        isAuthenticated: !!session,
        isLoading: false,
      });
    } catch (error) {
      logError('Unexpected error checking session:', error);
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async () => {
    const result = await signInWithGoogle();
    // The session will be updated via auth state change listener
    return result;
  },

  logout: async () => {
    const result = await signOut();
    if (!result.error) {
      set({ user: null, session: null, isAuthenticated: false });
    }
    return result;
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  setSession: (session: Session | null) => {
    set({ session, user: session?.user ?? null, isAuthenticated: !!session });
  },
}));

