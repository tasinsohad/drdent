'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSyncStore } from '@/lib/sync-store'

interface CacheOptions {
  table: 'conversations' | 'patients' | 'appointments' | 'messages'
  storageKey: string
}

export function useOfflineCache<T>(options: CacheOptions) {
  const { table, storageKey } = options
  const { isOnline, addToQueue } = useSyncStore()
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastCached, setLastCached] = useState<number | null>(null)

  const cacheKey = `dr-dent-cache-${storageKey}`

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setData(parsed.data)
        setLastCached(parsed.timestamp)
      } catch (e) {
        console.error('Failed to parse cached data:', e)
      }
    }
    setIsLoading(false)
  }, [cacheKey])

  const updateCache = useCallback((newData: T[]) => {
    setData(newData)
    const cacheData = {
      data: newData,
      timestamp: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    setLastCached(Date.now())
  }, [cacheKey])

  const optimisticUpdate = useCallback((item: Partial<T>, isNew: boolean = false) => {
    const tempId = `temp-${Date.now()}`
    
    const newItem = {
      ...item,
      id: (item as any).id || tempId,
      _isTemp: true,
      _synced: false
    } as T

    setData(prev => {
      if (isNew) {
        return [newItem, ...prev]
      }
      return prev.map((existing: T) => 
        (existing as any).id === (item as any).id ? newItem : existing
      )
    })

    if (!isOnline) {
      addToQueue(table, {
        table,
        type: isNew ? 'create' : 'update',
        data: item
      })
    }

    return tempId
  }, [isOnline, addToQueue, table])

  const markAsSynced = useCallback((tempId: string, serverId: string) => {
    setData(prev => prev.map((item: T) => {
      if ((item as any).id === tempId) {
        return { ...item, id: serverId, _isTemp: false, _synced: true } as T
      }
      return item
    }))
  }, [])

  const removeFromCache = useCallback((id: string) => {
    setData(prev => prev.filter((item: T) => (item as any).id !== id))

    if (!isOnline) {
      addToQueue(table, {
        table,
        type: 'delete',
        data: { id }
      })
    }
  }, [isOnline, addToQueue, table])

  return {
    data,
    setData: updateCache,
    isLoading,
    lastCached,
    optimisticUpdate,
    markAsSynced,
    removeFromCache
  }
}

export function useOfflineIndicator() {
  const { isOnline, pendingSync, isSyncing, lastSyncTime } = useSyncStore()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true)
    }
  }, [isOnline])

  const pendingCount = Object.values(pendingSync).flat().length

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    showOfflineBanner: !isOnline,
    showSyncIndicator: pendingCount > 0 || isSyncing
  }
}
