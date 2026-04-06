export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          workspace_id: string
          role: 'admin' | 'staff'
          created_at: string
        }
        Insert: {
          id: string
          workspace_id: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
      }
      ai_configs: {
        Row: {
          id: string
          workspace_id: string
          provider: 'google' | 'openai' | 'openrouter' | 'custom'
          base_url: string | null
          api_key_encrypted: string | null
          model: string
          system_prompt: string
          persona_name: string
          business_hours_start: string
          business_hours_end: string
          business_hours_timezone: string
          off_hours_message: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          provider?: 'google' | 'openai' | 'openrouter' | 'custom'
          base_url?: string | null
          api_key_encrypted?: string | null
          model?: string
          system_prompt?: string
          persona_name?: string
          business_hours_start?: string
          business_hours_end?: string
          business_hours_timezone?: string
          off_hours_message?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          provider?: 'google' | 'openai' | 'openrouter' | 'custom'
          base_url?: string | null
          api_key_encrypted?: string | null
          model?: string
          system_prompt?: string
          persona_name?: string
          business_hours_start?: string
          business_hours_end?: string
          business_hours_timezone?: string
          off_hours_message?: string
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          workspace_id: string
          name: string
          phone: string | null
          email: string | null
          tags: string[]
          notes: string | null
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          phone?: string | null
          email?: string | null
          tags?: string[]
          notes?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          tags?: string[]
          notes?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          workspace_id: string
          patient_id: string | null
          channel: 'whatsapp' | 'widget'
          status: 'active' | 'handled' | 'closed'
          assigned_to: string | null
          last_message: string | null
          last_message_at: string
          ai_paused: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          patient_id?: string | null
          channel?: 'whatsapp' | 'widget'
          status?: 'active' | 'handled' | 'closed'
          assigned_to?: string | null
          last_message?: string | null
          last_message_at?: string
          ai_paused?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          patient_id?: string | null
          channel?: 'whatsapp' | 'widget'
          status?: 'active' | 'handled' | 'closed'
          assigned_to?: string | null
          last_message?: string | null
          last_message_at?: string
          ai_paused?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          channel: 'whatsapp' | 'widget'
          tokens_used: number | null
          timestamp: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          channel?: 'whatsapp' | 'widget'
          tokens_used?: number | null
          timestamp?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          channel?: 'whatsapp' | 'widget'
          tokens_used?: number | null
          timestamp?: string
        }
      }
      appointments: {
        Row: {
          id: string
          workspace_id: string
          patient_id: string | null
          datetime: string
          duration: number
          treatment: string | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes: string | null
          gcal_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          patient_id?: string | null
          datetime: string
          duration?: number
          treatment?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          gcal_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          patient_id?: string | null
          datetime?: string
          duration?: number
          treatment?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          notes?: string | null
          gcal_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      widget_config: {
        Row: {
          id: string
          workspace_id: string
          primary_color: string
          greeting_text: string
          avatar_url: string | null
          position: 'bottom-right' | 'bottom-left'
          embed_token: string
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          primary_color?: string
          greeting_text?: string
          avatar_url?: string | null
          position?: 'bottom-right' | 'bottom-left'
          embed_token?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          primary_color?: string
          greeting_text?: string
          avatar_url?: string | null
          position?: 'bottom-right' | 'bottom-left'
          embed_token?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
