import { supabase } from '@/lib/supabase-client'

export async function getUserRole(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data.role
}

export async function isDeveloper(userId: string) {
  const role = await getUserRole(userId)
  
  if (role === 'developer' || role === 'admin') {
    return true
  }
  
  // If no role found, check if this is the very first user
  // (Auto-seed the first admin)
  const { count, error } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    
  if (!error && count === 0) {
    // This is the first user trying to access admin, make them a developer automatically!
    try {
      await setDeveloperRole(userId)
      return true
    } catch (e) {
      // Ignore if it fails due to table missing
    }
  }

  // Local development bypass
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  return false
}

export async function isAdmin(userId: string) {
  const role = await getUserRole(userId)
  return role === 'admin'
}

export async function setDeveloperRole(userId: string) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'developer' }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function getAllUsers() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) return []
  return users.users || []
}

export async function getAllWorkspaces() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

export async function getPlatformStats() {
  const [users, workspaces, patients, conversations, appointments] = await Promise.all([
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('workspaces').select('id'),
    supabase.from('patients').select('id'),
    supabase.from('conversations').select('id'),
    supabase.from('appointments').select('id'),
  ])

  return {
    totalUsers: (users.data || []).length,
    totalWorkspaces: (workspaces.data || []).length,
    totalPatients: (patients.data || []).length,
    totalConversations: (conversations.data || []).length,
    totalAppointments: (appointments.data || []).length,
  }
}
