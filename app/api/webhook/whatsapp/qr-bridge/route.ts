import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAIContext, generateAIResponse } from '@/lib/ai'
import { checkAvailability, createAppointment } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-api-key')
    const secret = process.env.WHATSAPP_SERVICE_API_KEY || 'default-secret'
    
    if (authHeader !== secret) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { from, body: messageText, pushname } = await request.json()
    console.log(`📥 [QR Bridge] Message from ${from}: "${messageText}"`)

    // 1. Get Workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    if (!workspace) {
      return new NextResponse('No workspace configured', { status: 500 })
    }
    const workspaceId = workspace.id

    // 2. Patient
    let patientId = ''
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('phone', from)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!existingPatient) {
      const { data: newPatient } = await supabase
        .from('patients')
        .insert({
          workspace_id: workspaceId,
          name: pushname || `WhatsApp User ${from.slice(-4)}`,
          phone: from,
          source: 'whatsapp_qr',
        })
        .select('id')
        .single()
      patientId = newPatient!.id
    } else {
      patientId = existingPatient.id
    }

    // 3. Conversation
    let conversationId = ''
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patientId)
      .eq('channel', 'whatsapp')
      .eq('status', 'active')
      .maybeSingle()

    if (!existingConv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspaceId,
          patient_id: patientId,
          channel: 'whatsapp',
          status: 'active',
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      conversationId = newConv!.id
    } else {
      conversationId = existingConv.id
    }

    // 4. Save User Message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: messageText,
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
    })

    // 5. AI Logic
    let reply = null
    const { config: aiConfig, pastMessages } = await getAIContext(workspaceId, conversationId)
    
    if (aiConfig) {
      const toolResults: any[] = []
      let loopCount = 0
      while (loopCount < 5) {
        const aiRes = await generateAIResponse(aiConfig, pastMessages, messageText, "\n\n(Context: You are replying via WhatsApp QR. Keep it concise.)", toolResults)
        
        if (aiRes.toolCalls) {
          toolResults.push({ role: 'assistant', tool_calls: aiRes.toolCalls })
          for (const tool of aiRes.toolCalls) {
            const args = JSON.parse(tool.function.arguments)
            let resultData = null
            if (tool.function.name === 'check_availability') {
              resultData = await checkAvailability(workspaceId, args.datetime, supabase)
            } else if (tool.function.name === 'book_appointment') {
              resultData = await createAppointment({
                patient_id: patientId,
                datetime: args.datetime,
                treatment: args.treatment,
                patient_name: args.patient_name,
                patient_phone: args.patient_phone
              }, supabase)
            }
            toolResults.push({ role: 'tool', tool_call_id: tool.id, functionName: tool.function.name, content: JSON.stringify(resultData) })
          }
          loopCount++
          continue
        }
        reply = aiRes.text
        break
      }
    }

    if (!reply) {
      reply = "Thanks for your message! Our team will get back to you shortly."
    }

    // 6. Save Assistant Message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      channel: 'whatsapp',
      timestamp: new Date().toISOString()
    })

    await supabase.from('conversations').update({
      last_message: reply,
      last_message_at: new Date().toISOString()
    }).eq('id', conversationId)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('❌ QR Bridge Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
