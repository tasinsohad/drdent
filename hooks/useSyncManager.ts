'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useSyncStore, SyncQueueItem } from '@/lib/sync-store'
import { supabase } from '@/lib/supabase-client'

const SYNC_INTERVAL = 30000
const MAX_RETRIES = 3

export function useSyncManager() {
  const {
    isOnline,
    isSyncing,
    pendingSync,
    setOnline,
    setSyncing,
    removeFromQueue,
    setLastSyncTime,
    setSyncError,
    getPendingCount
  } = useSyncStore()

  const syncInProgress = useRef(false)

  const syncItem = async (item: SyncQueueItem, supabase: any): Promise<boolean> => {
    const { table, type, data, id } = item
    
    try {
      if (type === 'create') {
        const { error } = await supabase.from(table).insert(data)
        if (error) throw error
      } else if (type === 'update') {
        const { error } = await supabase.from(table).update(data).eq('id', data.id)
        if (error) throw error
      } else if (type === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', data.id)
        if (error) throw error
      }
      
      removeFromQueue(table as keyof typeof pendingSync, id)
      return true
    } catch (error) {
      console.error(`Sync failed for ${table}:`, error)
      
      item.retries++
      if (item.retries >= MAX_RETRIES) {
        removeFromQueue(table as keyof typeof pendingSync, id)
        setSyncError(`Failed to sync ${table} after ${MAX_RETRIES} attempts`)
      }
      return false
    }
  }

  const syncAll = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return
    
    const pendingCount = getPendingCount()
    if (pendingCount === 0) return

    syncInProgress.current = true
    setSyncing(true)
    setSyncError(null)

    try {
      const tables = ['conversations', 'patients', 'appointments', 'messages'] as const
      for (const table of tables) {
        const items = pendingSync[table]
        for (const item of items) {
          if (item.status === 'pending') {
            await syncItem(item, supabase)
          }
        }
      }
      
      setLastSyncTime(Date.now())
    } catch (error) {
      console.error('Sync error:', error)
      setSyncError('Sync failed. Will retry when online.')
    } finally {
      syncInProgress.current = false
      setSyncing(false)
    }
  }, [isOnline, pendingSync, getPendingCount, setSyncing, setSyncError, setLastSyncTime])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      syncAll()
    }

    const handleOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (isOnline) {
      syncAll()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline, syncAll, setOnline])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        syncAll()
      }
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [isOnline, syncAll])

  return {
    isOnline,
    isSyncing,
    pendingCount: getPendingCount(),
    syncAll,
    getPendingCount
  }
}
