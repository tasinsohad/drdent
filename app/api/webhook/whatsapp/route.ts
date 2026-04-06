import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token'

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified!')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const messages = changes?.value?.messages

    if (!messages || messages.length === 0) {
      return new NextResponse('OK', { status: 200 })
    }

    for (const msg of messages) {
      const from = msg.from
      const messageText = msg.text?.body || ''
      const msgTimestamp = msg.timestamp

      if (!from || !messageText) continue

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single()

      if (!workspace) {
        console.error('No workspace found')
        continue
      }

      let patient
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', from)
        .eq('workspace_id', workspace.id)
        .single()

      if (existingPatient) {
        patient = existingPatient
      } else {
        const { data: newPatient } = await supabase
          .from('patients')
          .insert({
            workspace_id: workspace.id,
            name: `WhatsApp User ${from.slice(-4)}`,
            phone: from,
            source: 'whatsapp',
          })
          .select('id')
          .single()
        patient = newPatient
      }

      if (!patient) continue

      let conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('channel', 'whatsapp')
        .eq('status', 'active')
        .single()

      if (existingConv) {
        conversation = existingConv
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            workspace_id: workspace.id,
            patient_id: patient.id,
            channel: 'whatsapp',
            status: 'active',
            last_message: messageText,
            last_message_at: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
          })
          .select('id')
          .single()
        conversation = newConv
      }

      if (!conversation) continue

      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: messageText,
        channel: 'whatsapp',
        timestamp: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
      })

      await supabase.from('conversations').update({
        last_message: messageText,
        last_message_at: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
      }).eq('id', conversation.id)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
