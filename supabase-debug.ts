import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const tables = [
    'workspaces', 
    'ai_configs', 
    'patients', 
    'conversations', 
    'messages',
    'appointments', 
    'followup_configs', 
    'widget_config', 
    'whatsapp_config', 
    'audit_logs', 
    'analytics'
  ]
  
  console.log("Checking database schema status...")
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true })
    if (error) {
      console.log(`❌ ${table.padEnd(20)}: ${error.message}`)
    } else {
      console.log(`✅ ${table.padEnd(20)}: Table exists`)
    }
  }
}

test()
