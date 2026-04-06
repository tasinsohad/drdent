"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban, MessageCircle, Calendar, UserPlus, TrendingUp, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { getPlatformStats } from "@/lib/admin-auth"

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkspaces: 0,
    totalPatients: 0,
    totalConversations: 0,
    totalAppointments: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const platformStats = await getPlatformStats()
      setStats(platformStats)

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (roles) {
        const userIds = roles.map(r => r.user_id)
        const { data: users } = await supabase.auth.admin.listUsers()
        
        const recentUsersList = roles.map(role => {
          const user = users?.users?.find(u => u.id === role.user_id)
          return {
            email: user?.email || 'Unknown',
            role: role.role,
            created_at: role.created_at,
          }
        })
        setRecentUsers(recentUsersList)
      }
    } catch (err) {
      console.error('Failed to load admin data:', err)
    }
    setLoading(false)
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "blue" },
    { label: "Workspaces", value: stats.totalWorkspaces, icon: FolderKanban, color: "emerald" },
    { label: "Conversations", value: stats.totalConversations, icon: MessageCircle, color: "violet" },
    { label: "Appointments", value: stats.totalAppointments, icon: Calendar, color: "amber" },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>
        <p className="text-muted-foreground">Monitor your entire platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={user.role === 'developer' ? 'default' : 'secondary'} className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <a href="/admin/users" className="p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Manage Users</p>
                  <p className="text-xs text-muted-foreground">View, edit, and manage all users</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </a>
              <a href="/admin/workspaces" className="p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Manage Workspaces</p>
                  <p className="text-xs text-muted-foreground">View and manage all workspaces</p>
                </div>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
