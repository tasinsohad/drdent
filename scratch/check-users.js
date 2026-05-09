const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: configs, error: cError } = await supabase.from('whatsapp_config').select('*');
  if (configs) {
    configs.forEach(c => {
      console.log(`CONFIG [${c.id}]: enabled=${c.enabled}, hasToken=${!!c.access_token_encrypted}, tokenLen=${c.access_token_encrypted?.length}`);
    });
  }

  const { data: messages, error: mError } = await supabase.from('messages').select('*').order('timestamp', { ascending: false }).limit(5);
  if (mError) console.error(mError);
  else console.log('MESSAGES:', JSON.stringify(messages, null, 2));

  const { data: logs, error: lError } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(20);
  if (lError) console.error(lError);
  else console.log('LOGS:', JSON.stringify(logs, null, 2));
}
check();
