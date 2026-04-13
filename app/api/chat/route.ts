import { NextResponse } from 'next/server'
import { getAIContext, generateAIResponse } from '@/lib/ai'
import { supabaseServer } from '@/lib/supabase-server'
import { checkAvailability, createAppointment } from '@/lib/db'

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
    const trimmedMessage = typeof message === 'string' ? message.trim() : ''
    if (!trimmedMessage || !conversationId || !workspaceId) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
    }

    const imagePattern = /^(data:image\/|https?:\/\/.+\.(jpg|jpeg|png|gif|webp)|\[image)/
    if (imagePattern.test(trimmedMessage.toLowerCase())) {
      return NextResponse.json({ error: 'Image input is not supported. This AI model does not support image processing.' }, { status: 400 })
    }

    const supabase = supabaseServer

    // 1. Get Context (Config & History)
    const { config, pastMessages } = await getAIContext(workspaceId, conversationId)

    // 2. Generate Response
    let reply = ''
    const toolResults: any[] = []
    let loopCount = 0
    const MAX_LOOPS = 5

    while (loopCount < MAX_LOOPS) {
      const aiRes = await generateAIResponse(config, pastMessages, trimmedMessage, '', toolResults)
      
      if (aiRes.toolCalls) {
        // Add the assistant's tool call message to history
        toolResults.push({
          role: 'assistant',
          tool_calls: aiRes.toolCalls
        })

        for (const tool of aiRes.toolCalls) {
          const args = JSON.parse(tool.function.arguments)
          let resultData = null
          
          if (tool.function.name === 'check_availability') {
            resultData = await checkAvailability(workspaceId, args.datetime, supabase)
          } else if (tool.function.name === 'book_appointment') {
            // In widget chat, we need to know the patientId. 
            // Usually, widgets have a patient associated or it's an anonymous lead.
            // For now, we'll try to find a patient by conversation or create a lead.
            const { data: conv } = await supabase.from('conversations').select('patient_id').eq('id', conversationId).single()
            
            resultData = await createAppointment({
              patient_id: conv?.patient_id,
              datetime: args.datetime,
              treatment: args.treatment,
              patient_name: args.patient_name,
              patient_phone: args.patient_phone
            }, supabase)
          }

          toolResults.push({
            role: 'tool',
            tool_call_id: tool.id,
            functionName: tool.function.name,
            content: JSON.stringify(resultData)
          })
        }
        
        loopCount++
        continue
      }

      reply = aiRes.text || ''
      break
    }

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
