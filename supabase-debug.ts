import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Checking database state...")
  
  const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('*')
  if (wsError) console.error("❌ Workspace Fetch Error:", wsError.message)
  else console.log("📊 Workspaces count:", workspaces?.length || 0, workspaces)

  const { data: configs, error: cfgError } = await supabase.from('whatsapp_config').select('*')
  if (cfgError) console.error("❌ WhatsApp Config Error:", cfgError.message)
  else console.log("📊 WhatsApp Config count:", configs?.length || 0, configs)

  const { data: aiConfigs, error: aiError } = await supabase.from('ai_configs').select('*')
  if (aiError) console.error("❌ AI Config Error:", aiError.message)
  else console.log("📊 AI Configs:", aiConfigs)

  const { data: messages, error: msgError } = await supabase.from('messages').select('*').order('timestamp', { ascending: false }).limit(5)
  if (msgError) console.error("❌ Messages Error:", msgError.message)
  else console.log("📊 Recent Messages:", messages)

  const { data: logs, error: logError } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(10)
  if (logError) console.error("❌ System Logs Error:", logError.message)
  else console.log("📊 Recent System Logs:", logs)
}

test()
