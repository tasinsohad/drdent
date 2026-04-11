import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase-client'
import { signIn, signUp, signOut, getSession } from '@/lib/auth'

interface AppState {
  user: User | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  supabaseConnected: boolean
  supabaseError: string | null

  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
  checkSupabaseConnection: () => Promise<void>
  updateProfile: (updates: { displayName?: string; practiceName?: string }) => Promise<{ success: boolean; error?: string }>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      isInitialized: false,
      supabaseConnected: false,
      supabaseError: null,

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          if (!isSupabaseConfigured()) {
            const msg = 'Supabase not configured. Please check your environment variables.'
            set({ isLoading: false, error: msg })
            return { success: false, error: msg }
          }

          const { data, error } = await signIn(email, password)

          if (error) {
            const errorMsg = error.message || 'Login failed'
            set({ isLoading: false, error: errorMsg })
            return { success: false, error: errorMsg }
          }

          if (!data.user) {
            const errorMsg = 'Invalid credentials'
            set({ isLoading: false, error: errorMsg })
            return { success: false, error: errorMsg }
          }

          set({ user: data.user, isLoading: false, error: null })
          return { success: true }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Network error — please try again'
          console.error('[Dr. Dent] Login error:', typeof err === 'object' && err !== null ? (err as Error).constructor?.name : typeof err)
          set({ isLoading: false, error: errorMsg })
          return { success: false, error: errorMsg }
        }
      },

      signup: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          if (!isSupabaseConfigured()) {
            const msg = 'Supabase not configured. Please check your environment variables.'
            set({ isLoading: false, error: msg })
            return { success: false, error: msg }
          }

          const { data, error } = await signUp(email, password)
          if (error) {
            set({ isLoading: false, error: error.message })
            return { success: false, error: error.message }
          }

          set({ user: data.user, isLoading: false, error: null })
          return { success: true }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Signup failed'
          set({ isLoading: false, error: errorMsg })
          return { success: false, error: errorMsg }
        }
      },

      logout: async () => {
        await signOut()
        try {
          await fetch('/api/auth/clear-cookies', { method: 'POST' })
        } catch (_) {
          // Ignore clear-cookie errors on logout
        }
        set({ user: null, error: null, isInitialized: false })
      },

      initializeAuth: async () => {
        if (get().isInitialized) return

        set({ isLoading: true })

        if (!isSupabaseConfigured()) {
          set({ isInitialized: true, isLoading: false, error: 'Database not configured' })
          return
        }

        try {
          const { data } = await getSession()
          const session = data?.session

          if (session?.user) {
            set({ user: session.user, isInitialized: true, isLoading: false, error: null })
          } else {
            set({ user: null, isInitialized: true, isLoading: false, error: null })
          }
        } catch (_) {
          set({ user: null, isInitialized: true, isLoading: false, error: null })
        }
      },

      checkSupabaseConnection: async () => {
        const result = await testSupabaseConnection()
        set({
          supabaseConnected: result.success,
          supabaseError: result.success ? null : result.message,
        })
      },

      updateProfile: async (updates) => {
        try {
          const { error } = await supabase.auth.updateUser({
            data: {
              display_name: updates.displayName,
              practice_name: updates.practiceName,
            },
          })
          if (error) return { success: false, error: error.message }

          // Refresh user object in store
          const { data } = await supabase.auth.getUser()
          if (data.user) set({ user: data.user })

          return { success: true }
        } catch (err: unknown) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to update profile',
          }
        }
      },
    }),
    {
      name: 'dr-dent-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
