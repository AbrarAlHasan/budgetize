import { getSession, onAuthStateChange, signInWithGoogle, signOut } from '@/services/supabase/auth';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
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
    set({ isLoading: true });
    try {
      const { session, error } = await getSession();
      
      if (error) {
        console.error('Error initializing auth:', error);
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
        return;
      }

      set({
        user: session?.user ?? null,
        session: session,
        isAuthenticated: !!session,
        isLoading: false,
      });

      // Listen to auth state changes
      onAuthStateChange((event, session) => {
        set({
          user: session?.user ?? null,
          session: session,
          isAuthenticated: !!session,
        });
      });
    } catch (error) {
      console.error('Unexpected error initializing auth:', error);
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

