"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Search, Loader2, Users, Calendar, X, FileText } from "lucide-react"

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    patients: any[];
    appointments: any[];
  }>({ patients: [], appointments: [] })
  
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults({ patients: [], appointments: [] })
      return
    }
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [open])

  useEffect(() => {
    if (query.length < 2) {
      setResults({ patients: [], appointments: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (err) {
        console.error("Search failed", err)
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const hasResults = results.patients.length > 0 || results.appointments.length > 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border rounded-md transition-colors w-64 max-w-[200px] sm:max-w-none"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-background px-1.5 h-5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[20%] z-50 grid w-full max-w-lg translate-x-[-50%] gap-4 border bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl overflow-hidden p-0">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients, appointments..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin opacity-50" />
              ) : (
                <button onClick={() => setOpen(false)} className="opacity-50 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2">
              {query.length > 1 && !loading && !hasResults && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found for "{query}".
                </div>
              )}

              {query.length <= 1 && (
                <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <Search className="h-8 w-8 opacity-20" />
                  Type to search across your entire workspace
                </div>
              )}

              {results.patients.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Patients</div>
                  {results.patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect('/patients')}
                      className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50 cursor-pointer text-left"
                    >
                      <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        {(p.phone || p.email) && (
                          <span className="text-xs text-muted-foreground">{p.phone || p.email}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.appointments.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Appointments</div>
                  {results.appointments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleSelect('/appointments')}
                      className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50 cursor-pointer text-left"
                    >
                      <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{a.treatment || 'Consultation'} <span className="font-normal text-muted-foreground">with {a.patients?.name || 'Unknown Patient'}</span></span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} • {a.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Press <kbd className="font-mono bg-muted p-0.5 rounded px-1 text-[10px]">ESC</kbd> to close</span>
              <span>Search powered by Dr. Dent</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
