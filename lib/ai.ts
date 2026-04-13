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
          },
          patient_name: {
            type: 'string',
            description: 'The name of the patient (only if booking for someone else).'
          },
          patient_phone: {
            type: 'string',
            description: 'The phone number of the patient (only if booking for someone else).'
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

  if (provider === 'openai' || provider === 'openrouter') {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...pastMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: currentMessage },
      ...toolResults // Expecting messages with role 'tool' or 'assistant' (for tool_calls)
    ]

    const baseUrl = provider === 'openrouter' 
      ? 'https://openrouter.ai/api/v1' 
      : 'https://api.openai.com/v1'

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sanitizedApiKey}`,
        'HTTP-Referer': 'https://drdent.vercel.app',
        'X-Title': 'Dr. Dent'
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

    const data = await res.json()

    if (!res.ok) {
      console.error(`❌ ${provider} API Error Response:`, JSON.stringify(data, null, 2))
      const errMsg = data.error?.message || data.error || JSON.stringify(data)
      throw new Error(`${provider} Error: ${errMsg}`)
    }

    if (!data.choices || data.choices.length === 0) {
      console.error(`❌ ${provider} returned no choices:`, JSON.stringify(data, null, 2))
      throw new Error(`${provider} returned empty response. Check if the model supports tool calling or if you have credits.`)
    }

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

    // Add toolResults to Gemini history
    // toolResults are messages with role 'assistant' (with tool_calls) or 'tool'
    const toolHistory = toolResults.map(m => {
      if (m.role === 'assistant') {
        return {
          role: 'model',
          parts: m.tool_calls.map((tc: any) => ({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments)
            }
          }))
        }
      } else {
        return {
          role: 'user', // In Generative Language API, tool results are often role 'user' or 'function'
          parts: [{
            functionResponse: {
              name: 'unknown', // We don't have the name in the toolResults role 'tool' msg easily, but we can fix that
              response: { content: m.content }
            }
          }]
        }
      }
    })

    // To make functionResponse correct, we need the function name. 
    // Let's refine the toolResults format or lookup the name.
    // Actually, let's just make the toolResults format more Gemini-friendly.

    const geminiContents = [
      ...history,
      { role: 'user', parts: [{ text: currentMessage }] },
      ...toolResults.map(m => {
        if (m.role === 'assistant') {
          return {
            role: 'model',
            parts: m.tool_calls.map((tc: any) => ({
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments)
              }
            }))
          }
        }
        return {
          role: 'function', // Some versions use 'function' role
          parts: [{
            functionResponse: {
              name: (m as any).functionName || 'check_availability', // Fallback
              response: { result: m.content }
            }
          }]
        }
      })
    ]

    // Format tools for Gemini
    const geminiTools = [{
      function_declarations: TOOLS.map(t => t.function)
    }]

    const body = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: geminiTools,
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${sanitizedApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('❌ Gemini API Error Response:', JSON.stringify(data, null, 2))
      const errMsg = data.error?.message || JSON.stringify(data)
      throw new Error(`Gemini Error: ${errMsg}`)
    }
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
