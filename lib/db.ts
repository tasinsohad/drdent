import { supabase } from '@/lib/supabase-client'

async function getWorkspaceId() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)
    .single()
  
  if (error) return null
  return data?.id
}

export async function ensureWorkspace() {
  const existing = await getWorkspaceId()
  if (existing) return existing
  
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: 'My Practice',
      slug: `practice-${Date.now()}`,
    })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create workspace: ${error.message}`)
  
  // Also ensure default configs
  await supabase.from('ai_configs').upsert({ workspace_id: data.id }, { onConflict: 'workspace_id' })
  await supabase.from('widget_config').upsert({ workspace_id: data.id }, { onConflict: 'workspace_id' })
  await supabase.from('followup_configs').upsert({ workspace_id: data.id }, { onConflict: 'workspace_id' })
  
  return data.id
}

export async function initializeSaaS() {
  try {
    await ensureWorkspace()
    return { success: true }
  } catch (error: any) {
    console.error('Initialization error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function getWorkspace() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .limit(1)
    .single()
  
  if (error) return null
  return data
}

export async function getAIConfig() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null
  
  const { data, error } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  
  if (error) return null
  return data
}

export async function saveAIConfig(config: {
  provider?: string
  model?: string
  api_key_encrypted?: string
  system_prompt?: string
  persona_name?: string
  business_hours_start?: string
  business_hours_end?: string
  off_hours_message?: string
  supported_languages?: string[]
}) {
  const workspaceId = await ensureWorkspace()
  
  const { error } = await supabase
    .from('ai_configs')
    .upsert({
      workspace_id: workspaceId,
      provider: config.provider,
      model: config.model,
      api_key_encrypted: config.api_key_encrypted,
      system_prompt: config.system_prompt,
      persona_name: config.persona_name,
      business_hours_start: config.business_hours_start,
      business_hours_end: config.business_hours_end,
      off_hours_message: config.off_hours_message,
      supported_languages: config.supported_languages,
      updated_at: new Date().toISOString()
    }, { onConflict: 'workspace_id' })
  
  if (error) throw new Error(error.message)
}

export async function getWidgetConfig() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null
  
  const { data, error } = await supabase
    .from('widget_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  
  if (error) return null
  return data
}

export async function getWhatsAppConfig() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null
  
  const { data, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  
  if (error) return null
  return data
}

export async function saveWidgetConfig(config: {
  primary_color?: string
  greeting_text?: string
  position?: string
  enabled?: boolean
}) {
  const workspaceId = await ensureWorkspace()
  
  const { error } = await supabase
    .from('widget_config')
    .upsert({
      workspace_id: workspaceId,
      primary_color: config.primary_color,
      greeting_text: config.greeting_text,
      position: config.position,
      enabled: config.enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: 'workspace_id' })
  
  if (error) throw new Error(error.message)
}

export async function getPatients() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return []
  
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  
  if (error) return []
  return data || []
}

export async function getConversations() {
  console.log('[DEBUG getConversations] Starting...')
  
  try {
    // Direct query without workspace filter for now - simpler for debugging
    const { data, error } = await supabase
      .from('conversations')
      .select('*, patients(*)')
      .order('last_message_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[DEBUG getConversations] Error:', error.message, error.details)
      return []
    }
    
    console.log('[DEBUG getConversations] Found:', data?.length || 0, 'conversations')
    return data || []
  } catch (err: any) {
    console.error('[DEBUG getConversations] Exception:', err.message)
    return []
  }
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
  
  if (error) return []
  return data || []
}

export async function getAppointments() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return []
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(*)')
    .eq('workspace_id', workspaceId)
    .order('datetime', { ascending: true })
  
  if (error) return []
  return data || []
}

export async function getAnalytics(days: number = 7) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (error) return []
  return data || []
}

export async function createPatient(patient: { name: string; phone?: string; email?: string; status?: string; tags?: string[] }) {
  const workspaceId = await ensureWorkspace()
  
  const { data, error } = await supabase
    .from('patients')
    .insert({
      workspace_id: workspaceId,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      status: patient.status || 'lead',
      tags: patient.tags || [],
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function updatePatient(patientId: string, updates: {
  name?: string
  phone?: string
  email?: string
  status?: string
  tags?: string[]
}) {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString()
  }
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.phone !== undefined) payload.phone = updates.phone
  if (updates.email !== undefined) payload.email = updates.email
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.tags !== undefined) payload.tags = updates.tags

  const { error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', patientId)
  
  if (error) throw new Error(error.message)
}

export async function updatePatientStatus(patientId: string, newStatus: string) {
  const { error } = await supabase
    .from('patients')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', patientId)
  
  if (error) throw new Error(error.message)
}

export async function deletePatient(patientId: string, client = supabase) {
  const { error } = await client
    .from('patients')
    .delete()
    .eq('id', patientId)
  
  if (error) throw new Error(error.message)
}


export async function checkAvailability(workspaceId: string, datetime: string, client = supabase) {
  const start = new Date(datetime)
  const end = new Date(start.getTime() + 30 * 60000) // Default 30 min duration
  
  const { data, error } = await client
    .from('appointments')
    .select('id')
    .eq('workspace_id', workspaceId)
    .gte('datetime', start.toISOString())
    .lt('datetime', end.toISOString())
  
  if (error) return { available: false, error: error.message }
  return { available: data.length === 0 }
}

export async function createAppointment(appointment: {
  patient_id?: string
  datetime: string
  treatment?: string
  duration?: number
  patient_name?: string
  patient_phone?: string
}, client = supabase) {
  // Use provided client to get workspace
  const { data: ws } = await client.from('workspaces').select('id').limit(1).single()
  const workspaceId = ws?.id

  let finalPatientId = appointment.patient_id

  // Referral logic: if name/phone provided, create or find that patient
  if (appointment.patient_name || appointment.patient_phone) {
    const searchPhone = appointment.patient_phone || ''
    
    // Try to find
    const { data: existing } = await client
      .from('patients')
      .select('id')
      .eq('phone', searchPhone)
      .eq('workspace_id', workspaceId)
      .single()

    if (existing) {
      finalPatientId = existing.id
    } else {
      // Create new
      const { data: newP } = await client
        .from('patients')
        .insert({
          workspace_id: workspaceId,
          name: appointment.patient_name || `Patient ${searchPhone.slice(-4) || 'New'}`,
          phone: searchPhone,
          source: 'referral'
        })
        .select('id')
        .single()
      
      if (newP) finalPatientId = newP.id
    }
  }
  
  const { data, error } = await client
    .from('appointments')
    .insert({
      workspace_id: workspaceId,
      patient_id: finalPatientId,
      datetime: appointment.datetime,
      treatment: appointment.treatment,
      duration: appointment.duration || 30,
      status: 'pending',
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function getFollowupConfig() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return null
  
  const { data, error } = await supabase
    .from('followup_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  
  if (error) return null
  return data
}

export async function saveFollowupConfig(config: {
  enabled?: boolean
  reminder_24h?: boolean
  reminder_1h?: boolean
  reminder_30m?: boolean
  post_visit_followup?: boolean
  custom_message_24h?: string
  custom_message_1h?: string
  custom_message_30m?: string
  custom_post_visit?: string
}) {
  const workspaceId = await ensureWorkspace()
  
  const { error } = await supabase
    .from('followup_configs')
    .upsert({
      workspace_id: workspaceId,
      enabled: config.enabled,
      reminder_24h: config.reminder_24h,
      reminder_1h: config.reminder_1h,
      reminder_30m: config.reminder_30m,
      post_visit_followup: config.post_visit_followup,
      custom_message_24h: config.custom_message_24h,
      custom_message_1h: config.custom_message_1h,
      custom_message_30m: config.custom_message_30m,
      custom_post_visit: config.custom_post_visit,
      updated_at: new Date().toISOString()
    }, { onConflict: 'workspace_id' })
  
  if (error) throw new Error(error.message)
}

export async function updateConversationFollowup(conversationId: string, updates: {
  ai_paused?: boolean
  followup_disabled?: boolean
  assigned_to?: string | null
}) {
  // Build update payload, only including defined fields
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString()
  }
  if (updates.ai_paused !== undefined) payload.ai_paused = updates.ai_paused
  if (updates.followup_disabled !== undefined) payload.followup_disabled = updates.followup_disabled
  // assigned_to is set to null (AI mode) or left unset (human mode indicated by ai_paused flag)
  if (updates.assigned_to !== undefined) payload.assigned_to = updates.assigned_to === null ? null : updates.assigned_to

  const { error } = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', conversationId)
  
  if (error) throw error
}

export async function logAuditEvent(action: string, details: any = {}) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return
  
  const { data: user } = await supabase.auth.getUser()
  const userId = user?.user?.id
  const userEmail = user?.user?.email
  
  // Requires an audit_logs table with workspace_id, user_id, user_email, action, details
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      user_email: userEmail || 'system',
      action,
      details
    })
    
  if (error) {
    // Fail silently so it doesn't break the app if table doesn't exist yet
    console.error('Failed to write audit log:', error)
  }
}

export async function getAuditLogs(limit: number = 50) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return []
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) return []
  return data
}
