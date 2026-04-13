"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function WhatsAppStatusDot() {
  const router = useRouter()
  const [status, setStatus] = useState<'ready' | 'connecting' | 'qr' | 'disconnected'>('disconnected')
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      setStatus(data.status || 'disconnected')
    } catch (err) {
      setStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'qr': return 'bg-blue-500'
      default: return 'bg-red-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'ready': return 'WhatsApp Connected'
      case 'connecting': return 'WhatsApp Connecting...'
      case 'qr': return 'WhatsApp Needs QR Scan'
      default: return 'WhatsApp Disconnected'
    }
  }

  if (loading) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => router.push('/settings?tab=whatsapp')}
            className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <div className={cn("h-3 w-3 rounded-full animate-pulse", getStatusColor())} />
            <span className="sr-only">{getStatusText()}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
