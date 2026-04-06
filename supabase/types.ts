import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface Workspace {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface User {
  id: string
  email: string
  workspace_id: string
  role: 'admin' | 'staff'
}

export interface AIConfig {
  id: string
  workspace_id: string
  provider: 'google' | 'openai' | 'openrouter' | 'custom'
  base_url: string
  api_key: string
  model: string
  system_prompt: string
  persona_name: string
  business_hours: {
    start: string
    end: string
    timezone: string
  }
  off_hours_message: string
  created_at: string
  updated_at: string
}

export interface SupabaseConfig {
  id: string
  workspace_id: string
  project_url: string
  anon_key: string
  connection_status: 'connected' | 'disconnected' | 'error'
  last_tested: string
}

export interface Patient {
  id: string
  workspace_id: string
  name: string
  phone: string
  email: string
  tags: string[]
  notes: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  workspace_id: string
  patient_id: string
  channel: 'whatsapp' | 'widget'
  status: 'active' | 'handled' | 'closed'
  assigned_to: string | null
  last_message: string
  last_message_at: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  channel: 'whatsapp' | 'widget'
  timestamp: string
}

export interface Appointment {
  id: string
  workspace_id: string
  patient_id: string
  datetime: string
  duration: number
  treatment: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string
  gcal_event_id: string | null
  created_at: string
  updated_at: string
}

export interface WidgetConfig {
  id: string
  workspace_id: string
  primary_color: string
  greeting_text: string
  avatar_url: string
  position: 'bottom-right' | 'bottom-left'
  embed_token: string
  created_at: string
  updated_at: string
}
