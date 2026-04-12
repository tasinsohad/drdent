import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAIContext, generateAIResponse } from '@/lib/ai'
import { decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

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
  return new Response('Verification failed', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 WhatsApp WEBHOOK Received:', JSON.stringify(body, null, 2))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages || messages.length === 0) {
      console.log('ℹ️ No messages in webhook body')
      return new NextResponse('OK', { status: 200 })
    }

    for (const msg of messages) {
      const from = msg.from
      const messageText = msg.text?.body || ''
      const msgTimestamp = msg.timestamp

      console.log(`💬 Processing message from ${from}: "${messageText}"`)

      if (!from || !messageText) {
        console.warn('⚠️ Missing data in message:', { from, messageText })
        continue
      }

      // 1. Get/Initialize Workspace - use ANY existing workspace, don't create new
      let workspaceId = ''
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single()

      if (wsError || !workspace) {
        console.log('🛠️ No workspace found at all - this should not happen if migration ran')
        workspaceId = ''
      } else {
        workspaceId = workspace.id
        console.log('🏢 Using existing workspace:', workspaceId)
      }
      
      if (!workspaceId) {
        console.error('❌ No workspace available, cannot process message')
        return new NextResponse('No workspace configured', { status: 500 })
      }

      // 2. Find or Create Patient
      let patientId = ''
      const { data: existingPatient, error: pError } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', from)
        .eq('workspace_id', workspaceId)
        .single()

      if (pError || !existingPatient) {
        console.log(`👤 Creating new patient for ${from}`)
        const { data: newPatient, error: createPError } = await supabase
          .from('patients')
          .insert({
            workspace_id: workspaceId,
            name: `WhatsApp User ${from.slice(-4)}`,
            phone: from,
            source: 'whatsapp',
          })
          .select('id')
          .single()
        
        if (createPError) {
          console.error('❌ Failed to create patient:', createPError.message)
          continue
        }
        patientId = newPatient.id
      } else {
        patientId = existingPatient.id
      }
      console.log('👤 Patient ID:', patientId)

      // 3. Find or Create Conversation
      let conversationId = ''
      const { data: existingConv, error: cError } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('channel', 'whatsapp')
        .eq('status', 'active')
        .single()

      if (cError || !existingConv) {
        console.log(`🗪 Creating new conversation for patient ${patientId}`)
        const { data: newConv, error: createCError } = await supabase
          .from('conversations')
          .insert({
            workspace_id: workspaceId,
            patient_id: patientId,
            channel: 'whatsapp',
            status: 'active',
            last_message: messageText,
            last_message_at: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
          })
          .select('id')
          .single()

        if (createCError) {
          console.error('❌ Failed to create conversation:', createCError.message)
          continue
        }
        conversationId = newConv.id
      } else {
        conversationId = existingConv.id
      }
      console.log('🗪 Conversation ID:', conversationId)

      // 4. Save User Message
      const { error: msgInsertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: messageText,
        channel: 'whatsapp',
        timestamp: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
      })

      if (msgInsertError) {
        console.error('❌ Failed to save user message:', msgInsertError.message)
      }

      await supabase.from('conversations').update({
        last_message: messageText,
        last_message_at: new Date(parseInt(msgTimestamp) * 1000).toISOString(),
      }).eq('id', conversationId)

      // 5. AI Automated Response
      console.log('🤖 Starting AI response flow...')
      let reply = null
      let replySource = 'none'
      
      try {
        const { data: waConfig, error: configError } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('workspace_id', workspaceId)
          .single()

        if (configError) {
          console.error('❌ Failed to fetch WhatsApp config:', configError.message)
        }

        if (waConfig?.enabled && (waConfig.access_token_encrypted || waConfig.access_token)) {
          console.log('🤖 WhatsApp is enabled, getting AI response...')
          
          // Decrypt Meta access token
          const rawToken = decrypt(waConfig.access_token_encrypted || waConfig.access_token)
          
          // Get AI Response
          const { config: aiConfig, pastMessages } = await getAIContext(workspaceId, conversationId)
          
          if (!aiConfig) {
            console.warn('⚠️ AI not configured - using fallback')
            replySource = 'fallback-no-config'
          } else {
            try {
              reply = await generateAIResponse(aiConfig, pastMessages, messageText, "\n\n(Context: You are replying via WhatsApp. Keep it concise.)")
              replySource = reply ? 'ai' : 'fallback-empty'
            } catch (aiErr: any) {
              console.error('❌ AI generation failed:', aiErr.message)
              replySource = 'fallback-error'
            }
          }
        } else {
          console.log('ℹ️ WhatsApp not enabled or no token')
          replySource = 'disabled'
        }
      } catch (err: any) {
        console.error('❌ AI Response Error:', err.message)
        replySource = 'error'
      }

      // Fallback message if AI failed or not configured
      if (!reply) {
        reply = "Thanks for your message! Our team will get back to you shortly."
        console.log('📝 Using fallback response:', reply)
      } else {
        console.log(`🤖 AI Reply: "${reply}"`)
      }

      // Send reply via WhatsApp API
      if (replySource !== 'disabled') {
        try {
          // Get WhatsApp config for sending
          const { data: waConfig } = await supabase
            .from('whatsapp_config')
            .select('phone_number_id, access_token_encrypted')
            .eq('workspace_id', workspaceId)
            .single()

          if (waConfig?.phone_number_id && (waConfig.access_token_encrypted || process.env.WHATSAPP_ACCESS_TOKEN)) {
            const rawToken = decrypt(waConfig.access_token_encrypted || process.env.WHATSAPP_ACCESS_TOKEN || '')
            
            console.log('📤 Sending reply to Meta API...')
            const waRes = await fetch(`https://graph.facebook.com/v17.0/${waConfig.phone_number_id}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${rawToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: reply }
              })
            })

            if (waRes.ok) {
              console.log('✅ Reply sent successfully via Meta')
            } else {
              const waData = await waRes.json()
              console.error('❌ Meta API Error:', JSON.stringify(waData, null, 2))
            }
          }
        } catch (sendErr: any) {
          console.error('❌ Failed to send reply:', sendErr.message)
        }
      }

      // Save assistant message to DB
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
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error: any) {
    console.error('❌ Global Webhook Error:', error.message)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
