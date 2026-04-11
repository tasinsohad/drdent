import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Gracefully handle missing env vars instead of crashing at import time
let supabase: SupabaseClient

if (supabaseUrl && supabaseAnonKey) {
  supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn(
    '[Dr. Dent] Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
    'Database features will be unavailable.'
  )
  // Create a dummy client that won't crash — operations will fail gracefully
  supabase = createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
}

export { supabase }

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase environment variables are not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.' }
  }

  try {
    const { error } = await supabase.from('workspaces').select('id').limit(1)

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return { success: false, message: 'Database tables not found. Please run the migration script.' }
      }
      return { success: false, message: error.message }
    }

    return { success: true, message: 'Connected successfully!' }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect' }
  }
}
