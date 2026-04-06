import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// This endpoint would normally be called securely by a Cron service (like Vercel Cron)
// e.g. with an Authorization header carrying a CRON_SECRET

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    // In production, verify authHeader === `Bearer ${process.env.CRON_SECRET}`

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate time window: Appointments happening ~24 hours from now
    const now = new Date()
    const tomorrowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000) // 23 hours ahead
    const tomorrowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)   // 25 hours ahead

    // Fetch pending appointments within this window
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select('*, patients(*), workspaces(id)')
      .eq('status', 'pending')
      .gte('datetime', tomorrowStart.toISOString())
      .lte('datetime', tomorrowEnd.toISOString())

    if (aptError) {
      throw aptError
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ success: true, message: 'No appointments need 24h reminders right now.' })
    }

    let remindersSent = 0;

    for (const apt of appointments) {
      // Fetch followup config for this workspace
      const { data: config } = await supabase
        .from('followup_configs')
        .select('*')
        .eq('workspace_id', apt.workspace_id)
        .single()

      if (!config || !config.enabled || !config.reminder_24h) {
        continue;
      }

      // Check if conversation exists to ensure followup is not disabled per-conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('patient_id', apt.patient_id)
        .limit(1)
        .single()

      if (conversation && conversation.followup_disabled) {
        continue; // Patient or admin disabled followups for this conversation
      }

      const reminderMessage = config.custom_message_24h || "Hi! Just a reminder about your appointment tomorrow. See you then!"

      if (conversation) {
        // Insert message into the conversation
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: reminderMessage,
          channel: 'whatsapp'
        })
        
        await supabase.from('conversations').update({
          last_message: reminderMessage,
          last_message_at: new Date().toISOString()
        }).eq('id', conversation.id)

        // In a real app, you would dispatch a Twilio/WhatsApp API call here.
      }

      remindersSent++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: appointments.length, 
      remindersSent 
    })

  } catch (error: any) {
    console.error('Cron reminder error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
