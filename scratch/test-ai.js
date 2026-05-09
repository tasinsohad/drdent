const { createClient } = require('@supabase/supabase-js');
const { getAIContext, generateAIResponse } = require('../lib/ai');
const { decrypt } = require('../lib/encryption');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const workspaceId = '97079c03-da6e-452b-94bf-8436d0641455';
  const conversationId = '83e635cd-7b42-4c4b-a952-88ecdd7cfebe';
  const messageText = 'this is a text message';

  console.log('--- Testing AI Context ---');
  const { config, pastMessages } = await getAIContext(workspaceId, conversationId);
  console.log('Config found:', !!config);
  if (config) {
    console.log('Model:', config.model);
    console.log('Provider:', config.provider);
  }

  console.log('--- Generating AI Response ---');
  try {
    const res = await generateAIResponse(config, pastMessages, messageText, "\n\n(Context: You are replying via WhatsApp. Keep it concise.)");
    console.log('AI Response:', res);
  } catch (err) {
    console.error('AI Error:', err.message);
  }
}

test();
