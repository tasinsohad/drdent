import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const rateLimit = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxRequests = 20

  const record = rateLimit.get(ip)
  if (!record) {
    rateLimit.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (now - record.timestamp > windowMs) {
    rateLimit.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (record.count >= maxRequests) {
    return true
  }

  record.count += 1
  return false
}

interface SentimentResult {
  isFrustrated: boolean
  score: number
  indicators: string[]
}

function analyzeSentiment(text: string): SentimentResult {
  const frustratedKeywords = [
    { word: 'human', weight: 0.3 },
    { word: 'agent', weight: 0.2 },
    { word: 'person', weight: 0.15 },
    { word: 'manager', weight: 0.25 },
    { word: 'supervisor', weight: 0.3 },
    { word: 'angry', weight: 0.5 },
    { word: 'mad', weight: 0.4 },
    { word: 'frustrated', weight: 0.5 },
    { word: 'terrible', weight: 0.4 },
    { word: 'worst', weight: 0.5 },
    { word: 'horrible', weight: 0.5 },
    { word: 'awful', weight: 0.4 },
    { word: 'speak to someone', weight: 0.4 },
    { word: 'real person', weight: 0.35 },
    { word: 'call me', weight: 0.2 },
    { word: 'not helpful', weight: 0.4 },
    { word: 'useless', weight: 0.5 },
    { word: 'stupid', weight: 0.4 },
    { word: 'ridiculous', weight: 0.4 },
    { word: 'unacceptable', weight: 0.45 }
  ]

  const positiveKeywords = [
    { word: 'thank', weight: 0.2 },
    { word: 'great', weight: 0.2 },
    { word: 'perfect', weight: 0.25 },
    { word: 'excellent', weight: 0.25 },
    { word: 'wonderful', weight: 0.25 },
    { word: 'appreciate', weight: 0.2 }
  ]

  const lowerText = text.toLowerCase()
  let score = 0.5
  const indicators: string[] = []

  for (const kw of frustratedKeywords) {
    if (lowerText.includes(kw.word)) {
      score += kw.weight
      indicators.push(`negative: ${kw.word}`)
    }
  }

  for (const kw of positiveKeywords) {
    if (lowerText.includes(kw.word)) {
      score -= kw.weight
      indicators.push(`positive: ${kw.word}`)
    }
  }

  const hasExcessivePunctuation = /[!?]{2,}/.test(text) || (text.endsWith('!!!') || text.endsWith('???'))
  if (hasExcessivePunctuation) {
    score += 0.1
    indicators.push('excessive punctuation')
  }

  const hasAllCaps = text.length > 10 && text === text.toUpperCase()
  if (hasAllCaps) {
    score += 0.15
    indicators.push('all caps')
  }

  score = Math.max(0, Math.min(1, score))

  return {
    isFrustrated: score > 0.6,
    score,
    indicators
  }
}

function calculateConfidenceScore(reply: string, usedKnowledgeBase: boolean, matchedIntent: string | null): number {
  let score = 0.5

  if (usedKnowledgeBase) score += 0.25

  if (matchedIntent) score += 0.15

  if (reply.length > 50 && reply.length < 500) score += 0.1

  const hasPlaceholder = reply.includes('[clinic_phone]') || reply.includes('[dentist_name]')
  if (hasPlaceholder) score -= 0.1

  const isGeneric = [
    'sorry, i am having trouble',
    'i do not understand',
    'i cannot help with that'
  ].some(g => reply.toLowerCase().includes(g))
  
  if (isGeneric) score -= 0.2

  return Math.max(0, Math.min(1, score))
}

async function checkKnowledgeBase(query: string, workspaceId: string): Promise<{ results: string[], source: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/knowledge-base?workspaceId=${workspaceId}&query=${encodeURIComponent(query)}`
    )
    
    if (!response.ok) {
      return { results: [], source: 'none' }
    }

    const data = await response.json()
    return { results: data.results || [], source: data.source || 'none' }
  } catch {
    return { results: [], source: 'none' }
  }
}

async function checkIntents(query: string, workspaceId: string): Promise<{ matchedIntent: any, response: string, confidence: number } | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/intents?workspaceId=${workspaceId}&query=${encodeURIComponent(query)}`
    )

    if (!response.ok) return null

    const data = await response.json()
    
    if (data.intents && data.intents.length > 0) {
      const bestMatch = data.intents[0]
      return {
        matchedIntent: bestMatch,
        response: bestMatch.response_template,
        confidence: bestMatch.matchConfidence
      }
    }
  } catch {
    return null
  }
  return null
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { message, conversationId, workspaceId } = await request.json()
    if (!message || !conversationId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: config } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (!config || !config.api_key_encrypted) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const sentiment = analyzeSentiment(message)
    
    if (sentiment.isFrustrated) {
      await supabase
        .from('conversations')
        .update({ ai_paused: true })
        .eq('id', conversationId)

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: "I understand you may be frustrated, and I sincerely apologize for any inconvenience. I'm flagging this for immediate attention from our team. A staff member will respond shortly.",
          channel: 'widget',
          confidence_score: sentiment.score,
          intent_matched: 'escalate_frustration'
        })

      await supabase
        .from('notifications')
        .insert({
          workspace_id: workspaceId,
          type: 'urgent_message',
          title: 'Urgent: Frustrated Patient',
          message: `Patient expressed frustration in conversation ${conversationId}`,
          priority: 'high',
          link: `/conversations?id=${conversationId}`
        })

      return NextResponse.json({
        reply: "I understand you may be frustrated, and I sincerely apologize for any inconvenience. I'm flagging this for immediate attention from our team. A staff member will respond shortly.",
        paused: true,
        sentiment: sentiment,
        confidence: sentiment.score
      })
    }

    const intentMatch = await checkIntents(message, workspaceId)
    if (intentMatch && intentMatch.confidence >= 0.7) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: intentMatch.response,
          channel: 'widget',
          confidence_score: intentMatch.confidence,
          intent_matched: intentMatch.matchedIntent.name
        })

      return NextResponse.json({
        reply: intentMatch.response,
        usedIntent: intentMatch.matchedIntent.name,
        confidence: intentMatch.confidence,
        actionType: intentMatch.matchedIntent.action_type
      })
    }

    const knowledgeBase = await checkKnowledgeBase(message, workspaceId)
    let knowledgeContext = ''
    let usedKnowledgeBase = false

    if (knowledgeBase.results && knowledgeBase.results.length > 0) {
      knowledgeContext = `\n\nBased on our clinic's knowledge base:\n${knowledgeBase.results.join('\n\n')}`
      usedKnowledgeBase = true
    }

    const { data: pastMessages } = await supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(10)

    const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = []

    let systemPrompt = config.system_prompt || 'You are a helpful dental receptionist.'

    if (usedKnowledgeBase) {
      systemPrompt += '\n\nIMPORTANT: When answering questions, you should prioritize information from the provided knowledge base. Use that information to give accurate, clinic-specific answers.'
    }

    aiMessages.push({ role: 'system', content: systemPrompt })

    if (pastMessages) {
      pastMessages.reverse().forEach(msg => {
        aiMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      })
    }

    const userMessage = message + (knowledgeContext || '')
    aiMessages.push({ role: 'user', content: userMessage })

    const apiUrl = config.provider === 'google'
      ? `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.api_key_encrypted}`
      : 'https://api.openai.com/v1/chat/completions'

    let reply = "I'm having trouble connecting right now. Please try again or contact the clinic directly."
    let confidence = 0.5

    if (config.provider === 'openai') {
      const gptRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key_encrypted}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: aiMessages,
          max_tokens: 300,
          temperature: 0.7
        })
      })

      if (gptRes.ok) {
        const data = await gptRes.json()
        reply = data.choices[0].message.content
        confidence = calculateConfidenceScore(reply, usedKnowledgeBase, intentMatch?.matchedIntent?.name || null)
      } else {
        const err = await gptRes.text()
        console.error("OpenAI Error:", err)
        confidence = 0.2
      }
    } else if (config.provider === 'google') {
      const geminiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }]
        })
      })

      if (geminiRes.ok) {
        const data = await geminiRes.json()
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || reply
        confidence = calculateConfidenceScore(reply, usedKnowledgeBase, intentMatch?.matchedIntent?.name || null)
      }
    }

    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
        channel: 'widget',
        tokens_used: Math.ceil(reply.length / 4),
        confidence_score: confidence,
        intent_matched: intentMatch?.matchedIntent?.name || null,
        used_knowledge_base: usedKnowledgeBase
      })

    if (confidence < 0.5) {
      await supabase
        .from('notifications')
        .insert({
          workspace_id: workspaceId,
          type: 'low_confidence',
          title: 'Low Confidence AI Response',
          message: `AI responded with ${Math.round(confidence * 100)}% confidence to conversation ${conversationId}`,
          priority: 'medium',
          link: `/conversations?id=${conversationId}`
        })
    }

    return NextResponse.json({
      reply,
      confidence,
      usedKnowledgeBase,
      matchedIntent: intentMatch?.matchedIntent?.name || null,
      knowledgeSources: knowledgeBase.source !== 'none' ? knowledgeBase.results.length : 0
    })
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
