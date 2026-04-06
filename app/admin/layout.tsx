"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { isDeveloper } from "@/lib/admin-auth"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Shield
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: FolderKanban },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, isInitialized, isLoading, initializeAuth, logout } = useAppStore()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (isInitialized && user) {
      isDeveloper(user.id).then((dev) => {
        if (!dev) {
          router.push("/admin/login")
        } else {
          setAuthorized(true)
        }
      })
    } else if (isInitialized && !user) {
      router.push("/admin/login")
    }
  }, [isInitialized, user, router])

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  if (!isInitialized || isLoading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-900" />
          <p className="text-muted-foreground text-sm">Loading admin...</p>
        </div>
      </div>
    )
  }

  if (!user || !authorized) return null

  const userEmail = user.email || ""
  const userInitial = userEmail.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-slate-900 text-white transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Shield className="text-slate-900 h-4 w-4" />
            </div>
            {sidebarOpen && <span className="font-semibold">Admin</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-2">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/50 p-2",
            sidebarOpen ? "px-3" : "px-2 justify-center"
          )}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{userInitial}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <p className="text-xs text-slate-500">Developer</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white dark:bg-slate-950 dark:border-slate-800 px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {navItems.find(item => pathname === item.href)?.label || "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 dark:text-slate-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
