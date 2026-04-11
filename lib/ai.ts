import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getAIContext(workspaceId: string, conversationId: string) {
  // Fetch AI Config
  const { data: config } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!config || !config.api_key_encrypted) {
    throw new Error('AI not configured')
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
  const provider = config.provider || 'openai'
  const model = config.model || (provider === 'google' ? 'gemini-1.5-flash' : 'gpt-4o')
  const apiKey = config.api_key_encrypted
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
        'Authorization': `Bearer ${apiKey}`
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

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
