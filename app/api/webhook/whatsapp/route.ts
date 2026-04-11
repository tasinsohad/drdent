import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { getAIContext, generateAIResponse } from '@/lib/ai'

// Deployment Marker: 2026-04-11T14:30:00Z - Production-Ready Verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('📞 WhatsApp Webhook VERIFY Request:', { mode, token: token ? '***' : null, hasChallenge: !!challenge })

  if (mode === 'subscribe' && token && challenge) {
    const cleanToken = token.trim()
    
    // 1. Check environment variable
    const envToken = process.env.WHATSAPP_VERIFY_TOKEN
    if (envToken && cleanToken === envToken.trim()) {
      console.log('✅ Verified via ENV token')
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // 2. Fallback: Hardcoded tokens
    const validTokens = ['drdent', 'drdent_verify_2024', 'your-verify-token', 'dr_dent_whatsapp']
    if (validTokens.includes(cleanToken)) {
      console.log('✅ Verified via hardcoded fallback')
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    // 3. Check database config
    try {
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('webhook_verify_token')
        .eq('enabled', true)
        .limit(1)
        .single()

      if (config?.webhook_verify_token === cleanToken) {
        console.log('✅ Verified via DB token')
        return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
      }
    } catch (dbErr) {
      console.error('Webhook DB Auth Error:', dbErr)
    }
  }

  console.log('❌ Verification FAILED - invalid token')
  console.log('  Expected token: drdent, drdent_verify_2024, or WHATSAPP_VERIFY_TOKEN env var')
  return new Response('Verification failed', { status: 403 })
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

      // --- NEW: AI Automated Response ---
      try {
        const { data: waConfig } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('workspace_id', workspace.id)
          .single()

        if (waConfig?.enabled && waConfig.access_token_encrypted) {
          // 1. Get AI Response
          const { config, pastMessages } = await getAIContext(workspace.id, conversation.id)
          const reply = await generateAIResponse(config, pastMessages, messageText, "\n\n(Context: You are replying via WhatsApp. Keep it concise.)")

          if (reply) {
            // 2. Send via WhatsApp API
            const waRes = await fetch(`https://graph.facebook.com/v17.0/${waConfig.phone_number_id}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waConfig.access_token_encrypted}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: reply }
              })
            })

            const waData = await waRes.json()
            console.log('WhatsApp Send Response:', JSON.stringify(waData))

            if (waRes.ok) {
              // 3. Save AI message to DB
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                role: 'assistant',
                content: reply,
                channel: 'whatsapp',
                timestamp: new Date().toISOString()
              })

              await supabase.from('conversations').update({
                last_message: reply,
                last_message_at: new Date().toISOString()
              }).eq('id', conversation.id)
            }
          }
        }
      } catch (aiErr) {
        console.error('AI Automated Response Error:', aiErr)
      }
      // --- END AI Automated Response ---
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
