import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    let event
    try {
      const parts = signature.split(',')
      const signatureMap: Record<string, string> = {}
      for (const part of parts) {
        const [key, value] = part.split('=')
        if (key && value) signatureMap[key] = value
      }
      const timestamp = signatureMap['t']
      const expectedSignature = signatureMap['v1']

      const payload = `${timestamp}.${body}`
      const signedPayload = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')

      if (signedPayload !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }

      event = JSON.parse(body)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const metadata = paymentIntent.metadata

        if (metadata.workspace_id) {
          await supabase
            .from('payments')
            .update({ status: 'completed' })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          if (metadata.conversation_id) {
            const { data: conversation } = await supabase
              .from('conversations')
              .select('patient_id')
              .eq('id', metadata.conversation_id)
              .single()

            if (conversation) {
              await supabase
                .from('messages')
                .insert({
                  conversation_id: metadata.conversation_id,
                  role: 'assistant',
                  content: 'Payment confirmed. Thank you!',
                  channel: 'widget'
                })
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const metadata = paymentIntent.metadata

        if (metadata.workspace_id) {
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const workspaceId = subscription.metadata?.workspace_id

        if (workspaceId) {
          const statusMap: Record<string, string> = {
            active: 'active',
            trialing: 'trialing',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'unpaid',
            paused: 'paused'
          }

          await supabase
            .from('subscriptions')
            .upsert({
              workspace_id: workspaceId,
              stripe_subscription_id: subscription.id,
              status: statusMap[subscription.status] || 'unknown',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            }, { onConflict: 'stripe_subscription_id' })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const workspaceId = invoice.metadata?.workspace_id

        if (workspaceId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('workspace_id', workspaceId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const workspaceId = invoice.metadata?.workspace_id

        if (workspaceId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('workspace_id', workspaceId)
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}