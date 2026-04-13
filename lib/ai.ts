import { supabaseServer } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'

// Use the server-side client for AI context fetching
const supabase = supabaseServer

export async function getAIContext(workspaceId: string, conversationId: string) {
  const { data: config } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!config || !config.api_key_encrypted) {
    console.warn('⚠️ AI not configured for workspace:', workspaceId)
    return { config: null, pastMessages: [] }
  }

  // Fetch Past Messages
  const { data: pastMessages } = await supabase
    .from('messages')
    .select('content, role')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(10)

  return { config, pastMessages: pastMessages?.reverse() || [] }
}

export async function generateAIResponse(
  config: any,
  pastMessages: any[],
  currentMessage: string,
  systemPromptAddition: string = ''
) {
  if (!config || !config.api_key_encrypted) {
    throw new Error('AI configuration is missing')
  }

  const provider = config.provider || 'openai'
  const model = config.model || (provider === 'google' ? 'gemini-1.5-flash' : 'gpt-4o')
  const apiKey = decrypt(config.api_key_encrypted)
  
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Invalid API key')
  }
  
  const sanitizedApiKey = apiKey.replace(/[^\x20-\x7E]/g, '')
  if (sanitizedApiKey !== apiKey) {
    console.warn('⚠️ API key contained non-printable characters, sanitized')
  }
  
  const baseSystemPrompt = config.system_prompt || 'You are a helpful dental receptionist.'
  const systemPrompt = baseSystemPrompt + systemPromptAddition

  if (provider === 'openai') {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...pastMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: currentMessage }
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sanitizedApiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI Error: ${err}`)
    }

    const data = await res.json()
    return data.choices[0].message.content

  } else if (provider === 'google') {
    const history = pastMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const body = {
      contents: [
        ...history,
        { role: 'user', parts: [{ text: currentMessage }] }
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${sanitizedApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini Error: ${err}`)
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text
  }

  throw new Error('Unsupported provider')
}
