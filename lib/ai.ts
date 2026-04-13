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

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check if a specific date and time is available for an appointment.',
      parameters: {
        type: 'object',
        properties: {
          datetime: {
            type: 'string',
            description: 'The requested appointment date and time (ISO format or descriptive like "2024-04-14T10:00:00Z").'
          }
        },
        required: ['datetime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book a dental appointment for a patient.',
      parameters: {
        type: 'object',
        properties: {
          datetime: {
            type: 'string',
            description: 'The appointment date and time (ISO format).'
          },
          treatment: {
            type: 'string',
            description: 'The type of treatment requested (e.g., cleaning, checkup).'
          }
        },
        required: ['datetime']
      }
    }
  }
]

export async function generateAIResponse(
  config: any,
  pastMessages: any[],
  currentMessage: string,
  systemPromptAddition: string = '',
  toolResults: any[] = []
): Promise<{ text?: string, toolCalls?: any[] }> {
  if (!config || !config.api_key_encrypted) {
    throw new Error('AI configuration is missing')
  }

  const provider = config.provider || 'openai'
  const model = config.model || (provider === 'google' ? 'gemini-1.5-flash' : 'gpt-4o')
  const apiKey = decrypt(config.api_key_encrypted)
  
  const sanitizedApiKey = apiKey.replace(/[^\x20-\x7E]/g, '')
  const baseSystemPrompt = config.system_prompt || 'You are Emma, a friendly dental receptionist.'
  const systemPrompt = baseSystemPrompt + systemPromptAddition + "\n\nCRITICAL: Always use check_availability before booking. Today is " + new Date().toLocaleDateString()

  if (provider === 'openai') {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...pastMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: currentMessage },
      ...toolResults // Expecting messages with role 'tool' or 'assistant' (for tool_calls)
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
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI Error: ${err}`)
    }

    const data = await res.json()
    const message = data.choices[0].message
    
    if (message.tool_calls) {
      return { toolCalls: message.tool_calls }
    }
    return { text: message.content }

  } else if (provider === 'google') {
    const history = pastMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    // Format tools for Gemini
    const geminiTools = [{
      function_declarations: TOOLS.map(t => t.function)
    }]

    const body = {
      contents: [
        ...history,
        { role: 'user', parts: [{ text: currentMessage }] }
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: geminiTools,
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
    const part = data.candidates?.[0]?.content?.parts?.[0]
    
    if (part?.functionCall) {
      // Normalize Gemini function call to look a bit like OpenAI's for easier handling
      return { 
        toolCalls: [{
          id: 'call_' + Date.now(),
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args)
          }
        }]
      }
    }
    
    return { text: part?.text }
  }

  throw new Error('Unsupported provider')
}
