"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/store"
import {
  MessageCircle,
  Calendar,
  Users,
  Settings,
  BarChart3,
  Bot,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  CheckCircle2,
  Loader2,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { GlobalSearch } from "@/components/global-search"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { SyncIndicator, SyncStatusBadge } from "@/components/sync-indicator"
import { useSyncManager } from "@/hooks/useSyncManager"
import { supabase } from "@/lib/supabase-client"

const navItems = [
  { href: "/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  priority: string
  link: string | null
  created_at: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, isInitialized, isLoading, initializeAuth, logout, supabaseConnected, checkSupabaseConnection } = useAppStore()
  
  useSyncManager()

  useEffect(() => {
    initializeAuth()
    checkSupabaseConnection()
  }, [initializeAuth, checkSupabaseConnection])

  useEffect(() => {
    if (isInitialized && !user && !isLoading) {
      router.push("/login")
    }
  }, [isInitialized, user, isLoading, router])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single()

      if (!workspace) return

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(notifs || [])
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }, [user])

  useEffect(() => {
    loadNotifications()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/conversations')
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }

      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
        setUserMenuOpen(false)
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        setSidebarOpen(false)
      }
    }
  }, [])

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userEmail = user.email || ""
  const userInitial = userEmail.charAt(0).toUpperCase()

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-amber-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent_message': return <MessageCircle className="h-4 w-4 text-red-500" />
      case 'low_confidence': return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'payment_received': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r bg-background transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/conversations" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            {sidebarOpen && <span className="font-semibold hidden sm:block">Dr. Dent</span>}
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="hidden sm:inline">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-2">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border bg-muted/50 p-2",
            sidebarOpen ? "px-3" : "px-2 justify-center"
          )}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{userInitial}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm font-medium truncate">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-30 md:hidden shadow-lg"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base md:text-lg font-semibold">
              {navItems.find(item => pathname.startsWith(item.href))?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
            {/* Search button - mobile */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Search - desktop */}
            <div className="hidden md:block w-full max-w-md">
              <GlobalSearch />
            </div>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border bg-background shadow-lg z-50 max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                          Mark all read
                        </Button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-[60vh]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif.id)
                              if (notif.link) router.push(notif.link)
                              setNotificationsOpen(false)
                            }}
                            className={cn(
                              "w-full text-left p-4 border-b hover:bg-muted/50 transition-colors",
                              !notif.read && "bg-blue-50/50 dark:bg-blue-950/20"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getTypeIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{notif.title}</p>
                                  {getPriorityIcon(notif.priority)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Connection status */}
            {supabaseConnected && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-3 w-3" />
                <span>Connected</span>
              </div>
            )}
            
            <ThemeToggle />
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{userInitial}</span>
                </div>
              </Button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <div className="p-4 md:p-6">
          {children}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="hidden lg:flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground border-t">
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd> Search</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘N</kbd> New</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘/</kbd> Toggle sidebar</span>
        </div>
      </main>

      {/* Mobile search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
          <div className="fixed top-0 left-0 right-0 bg-background p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patients, appointments..."
                className="flex-1 bg-transparent outline-none text-lg"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <OnboardingWizard />
      <SyncIndicator />
    </div>
  )
}
