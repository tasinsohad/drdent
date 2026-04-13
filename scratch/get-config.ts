import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: configs, error: cfgError } = await supabase.from('whatsapp_config').select('*')
  if (cfgError) {
    console.error("❌ WhatsApp Config Error:", cfgError.message)
  } else {
    console.log("CONFIG_DATA_START")
    console.log(JSON.stringify(configs, null, 2))
    console.log("CONFIG_DATA_END")
  }
}

test()
