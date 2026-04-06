import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data: any
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed'
}

export interface PendingSync {
  conversations: SyncQueueItem[]
  patients: SyncQueueItem[]
  appointments: SyncQueueItem[]
  messages: SyncQueueItem[]
}

interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingSync: PendingSync
  lastSyncTime: number | null
  syncError: string | null
  
  // Actions
  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  addToQueue: (table: keyof PendingSync, item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>) => string
  removeFromQueue: (table: keyof PendingSync, id: string) => void
  setLastSyncTime: (time: number) => void
  setSyncError: (error: string | null) => void
  clearQueue: (table?: keyof PendingSync) => void
  getPendingCount: () => number
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      pendingSync: {
        conversations: [],
        patients: [],
        appointments: [],
        messages: []
      },
      lastSyncTime: null,
      syncError: null,

      setOnline: (online) => set({ isOnline: online }),
      
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      addToQueue: (table, item) => {
        const id = generateId()
        const queueItem: SyncQueueItem = {
          ...item,
          id,
          timestamp: Date.now(),
          retries: 0,
          status: 'pending'
        }
        
        set((state) => ({
          pendingSync: {
            ...state.pendingSync,
            [table]: [...state.pendingSync[table], queueItem]
          }
        }))
        
        return id
      },

      removeFromQueue: (table, id) => {
        set((state) => ({
          pendingSync: {
            ...state.pendingSync,
            [table]: state.pendingSync[table].filter(item => item.id !== id)
          }
        }))
      },

      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      
      setSyncError: (error) => set({ syncError: error }),

      clearQueue: (table) => {
        if (table) {
          set((state) => ({
            pendingSync: {
              ...state.pendingSync,
              [table]: []
            }
          }))
        } else {
          set({
            pendingSync: {
              conversations: [],
              patients: [],
              appointments: [],
              messages: []
            }
          })
        }
      },

      getPendingCount: () => {
        const { pendingSync } = get()
        return (
          pendingSync.conversations.length +
          pendingSync.patients.length +
          pendingSync.appointments.length +
          pendingSync.messages.length
        )
      }
    }),
    {
      name: 'dr-dent-sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        pendingSync: state.pendingSync,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
)
