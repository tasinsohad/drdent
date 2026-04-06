import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase-client'
import { signIn, signUp, signOut, getUser, getSession } from '@/lib/auth'

interface AppState {
  user: any | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  supabaseConnected: boolean
  supabaseError: string | null
  
  setUser: (user: any | null) => void
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
  checkSupabaseConnection: () => Promise<void>
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
          const { data, error } = await signIn(email, password)
          if (error) {
            set({ isLoading: false, error: error.message })
            return { success: false, error: error.message }
          }
          
          if (!data.session) {
            set({ isLoading: false, error: 'No session created' })
            return { success: false, error: 'Login failed - no session' }
          }
          
          const session = data.session
          const response = await fetch('/api/auth/set-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            }),
          })
          if (!response.ok) {
            console.error('Failed to set auth cookies')
          }
          
          set({ user: data.user, isLoading: false, error: null })
          return { success: true }
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to login'
          console.error('Login error:', err)
          set({ isLoading: false, error: errorMsg })
          return { success: false, error: errorMsg }
        }
      },

      signup: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await signUp(email, password)
          if (error) {
            set({ isLoading: false, error: error.message })
            return { success: false, error: error.message }
          }
          
          const session = data.session
          if (session) {
            const response = await fetch('/api/auth/set-cookies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
              }),
            })
            if (!response.ok) {
              console.error('Failed to set auth cookies')
            }
          }
          
          set({ user: data.user, isLoading: false, error: null })
          return { success: true }
        } catch (err: any) {
          set({ isLoading: false, error: err.message })
          return { success: false, error: err.message }
        }
      },

      logout: async () => {
        await signOut()
        try {
          await fetch('/api/auth/clear-cookies', { method: 'POST' })
        } catch (e) {}
        set({ user: null, error: null })
      },

      initializeAuth: async () => {
        if (get().isInitialized) return
        
        set({ isLoading: true })
        
        if (!isSupabaseConfigured()) {
          set({ isInitialized: true, isLoading: false, error: 'Supabase not configured' })
          return
        }
        
        const { data, error: sessionError } = await getSession()
        const session = data?.session
        
        if (session?.user) {
          set({ user: session.user, isInitialized: true, isLoading: false })
        } else {
          set({ user: null, isInitialized: true, isLoading: false })
        }
      },

      checkSupabaseConnection: async () => {
        const result = await testSupabaseConnection()
        set({ supabaseConnected: result.success, supabaseError: result.success ? null : result.message })
      },
    }),
    {
      name: 'dr-dent-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
