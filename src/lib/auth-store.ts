'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasSeenAuth: boolean;
  authMode: 'signin' | 'signup' | 'reset';
  session: any | null;
  isInitialized: boolean;
  
  // Actions
  init: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  setAuthMode: (mode: 'signin' | 'signup' | 'reset') => void;
  checkSession: () => Promise<void>;
  markAuthAsSeen: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      hasSeenAuth: false,
      authMode: 'signin',
      session: null,
      isInitialized: false,

      init: async () => {
        // Check for existing session first
        await get().checkSession();
        set({ isInitialized: true });
      },

      checkSession: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Get profile
            let profile = null;
            try {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              profile = data;
            } catch (e) {
              // Profile might not exist, that's ok
            }
            
            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: profile?.name || session.user.user_metadata?.name,
                createdAt: session.user.created_at,
              },
              session,
              isAuthenticated: true,
              isGuest: false,
              hasSeenAuth: true,
            });
          } else {
            // No valid session - ensure we're in guest mode
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isGuest: true,
            });
          }
        } catch (error) {
          console.error('Session check error:', error);
          // On error, default to guest mode
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isGuest: true,
          });
        }
      },

      signUp: async (email, password, name) => {
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });
          
          const data = await response.json();
          
          if (!data.success) {
            return { success: false, error: data.error };
          }
          
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      signIn: async (email, password) => {
        try {
          const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          const data = await response.json();
          
          if (!data.success) {
            return { success: false, error: data.error };
          }
          
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isGuest: false,
            hasSeenAuth: true,
          });
          
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      resetPassword: async (email) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/api/auth/callback`,
          });
          
          if (error) {
            return { success: false, error: error.message };
          }
          
          set({ authMode: 'signin' });
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Sign out error:', error);
        }
        
        // Reset to guest mode after sign out
        set({ 
          user: null, 
          session: null,
          isAuthenticated: false, 
          isGuest: true,
          hasSeenAuth: false 
        });
      },

      continueAsGuest: () => {
        set({ 
          user: null, 
          session: null,
          isAuthenticated: false, 
          isGuest: true, 
          hasSeenAuth: true 
        });
      },

      setAuthMode: (mode) => {
        set({ authMode: mode });
      },

      markAuthAsSeen: () => {
        set({ hasSeenAuth: true });
      },
    }),
    {
      name: 'vynthen-auth-storage',
      partialize: (state) => ({
        hasSeenAuth: state.hasSeenAuth,
        isGuest: state.isGuest,
        // Don't persist isAuthenticated or user - these should be verified with Supabase on load
      }),
    }
  )
);
