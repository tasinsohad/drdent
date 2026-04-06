'use client'

import { useEffect, useState } from 'react'
import { useSyncStore } from '@/lib/sync-store'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SyncIndicator() {
  const { isOnline, isSyncing, pendingSync, lastSyncTime, syncError } = useSyncStore()
  const [visible, setVisible] = useState(false)

  const pendingCount = Object.values(pendingSync).flat().length

  useEffect(() => {
    if (!isOnline || pendingCount > 0 || syncError) {
      setVisible(true)
    } else if (isOnline && pendingCount === 0 && !syncError) {
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, pendingCount, syncError])

  if (!visible && !isSyncing) return null

  return (
    <div className={cn(
      "fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 transition-all duration-300",
      !isOnline && "md:max-w-sm"
    )}>
      {!isOnline ? (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <CloudOff className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">You&apos;re offline</p>
            <p className="text-xs opacity-90">
              {pendingCount > 0 
                ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} will sync when online`
                : 'Changes will be saved locally'
              }
            </p>
          </div>
        </div>
      ) : syncError ? (
        <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Sync failed</p>
            <p className="text-xs opacity-90">{syncError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white/20 rounded text-xs font-medium hover:bg-white/30"
          >
            Retry
          </button>
        </div>
      ) : isSyncing ? (
        <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Syncing...</p>
            <p className="text-xs opacity-90">
              {pendingCount > 0 
                ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} remaining`
                : 'Connecting to server'
              }
            </p>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Cloud className="h-5 w-5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Back online</p>
            <p className="text-xs opacity-90">
              {pendingCount} pending change{pendingCount > 1 ? 's' : ''} syncing...
            </p>
          </div>
        </div>
      ) : lastSyncTime ? (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Check className="h-5 w-5" />
          <p className="text-sm font-medium">
            All changes saved
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function SyncStatusBadge() {
  const { isOnline, isSyncing, pendingSync } = useSyncStore()
  const pendingCount = Object.values(pendingSync).flat().length

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors",
      !isOnline && "bg-amber-100 text-amber-700",
      isOnline && !isSyncing && pendingCount === 0 && "bg-green-100 text-green-700",
      isSyncing && "bg-blue-100 text-blue-700",
      isOnline && !isSyncing && pendingCount > 0 && "bg-blue-100 text-blue-700"
    )}>
      {!isOnline ? (
        <>
          <CloudOff className="h-3 w-3" />
          <span>Offline</span>
          {pendingCount > 0 && <span className="font-medium">({pendingCount})</span>}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-3 w-3" />
          <span>Pending ({pendingCount})</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
    </div>
  )
}
