"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, Users, MoreHorizontal, UserX, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
      setUsers(allUsers || [])

      const { data: roles } = await supabase.from('user_roles').select('user_id, role')
      const roleMap: Record<string, string> = {}
      roles?.forEach(r => { roleMap[r.user_id] = r.role })
      setUserRoles(roleMap)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
    setLoading(false)
  }

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleMakeDeveloper = async (userId: string) => {
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'developer' }, { onConflict: 'user_id' })
    loadUsers()
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    try {
      await supabase.auth.admin.deleteUser(userId)
      loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {search ? `No results for "${search}"` : "No users have signed up yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Last Sign In</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-medium">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={userRoles[user.id] === 'developer' ? 'default' : 'secondary'} className="text-xs">
                          {userRoles[user.id] || 'user'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {userRoles[user.id] !== 'developer' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleMakeDeveloper(user.id)}
                            >
                              Make Developer
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
