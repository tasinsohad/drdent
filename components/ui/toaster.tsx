"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <Toaster>")
  return ctx
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-blue-500 flex-shrink-0" aria-hidden="true" />,
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60",
  error: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60",
  warning: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60",
  info: "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60",
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const variant = t.variant ?? "info"

  useEffect(() => {
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true))
    const duration = t.duration ?? 5000
    const timer = setTimeout(() => handleDismiss(), duration)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.duration])

  const handleDismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(t.id), 200)
  }, [t.id, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "flex items-start gap-3 w-full max-w-sm pointer-events-auto rounded-xl border px-4 py-3 shadow-lg transition-all duration-200",
        VARIANT_STYLES[variant],
        visible && !leaving ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      {ICONS[variant]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{t.title}</p>
        {t.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    counterRef.current += 1
    const id = `toast-${counterRef.current}`
    setToasts((prev) => [...prev, { ...opts, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
