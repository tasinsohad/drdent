"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, Loader2, Calendar, Users, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export default function AdminWorkspacesPage() {
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false })
      setWorkspaces(data || [])
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workspaces</h2>
        <p className="text-muted-foreground">Manage all workspaces</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground">Workspaces will appear here when users sign up and run migrations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">{ws.slug}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(ws.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Color</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: ws.primary_color }} />
                      <span className="font-mono text-xs">{ws.primary_color}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
