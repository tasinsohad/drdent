import { NextResponse } from 'next/server'
import { getAIContext, generateAIResponse } from '@/lib/ai'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
  if (record.count >= maxRequests) return true
  record.count += 1
  return false
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

    const supabase = supabaseServer

    // 1. Get Context (Config & History)
    const { config, pastMessages } = await getAIContext(workspaceId, conversationId)

    // 2. Generate Response
    const reply = await generateAIResponse(config, pastMessages, message)

    // 3. Save AI message to DB
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      channel: 'widget',
      timestamp: new Date().toISOString()
    })

    // 4. Update conversation state
    await supabase.from('conversations').update({
      last_message: reply,
      last_message_at: new Date().toISOString()
    }).eq('id', conversationId)

    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
