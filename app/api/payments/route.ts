import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function encryptKey(key: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    return Buffer.from(key).toString('base64')
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const encrypted = Buffer.from(data).toString('base64')
  return encrypted
}

function decryptKey(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  }
  const decoded = Buffer.from(encrypted, 'base64').toString('utf-8')
  return decoded
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*, patients(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payments: payments || [] })
}

export async function POST(request: Request) {
  try {
    const { workspaceId, patientId, conversationId, amount, currency, description } = await request.json()

    if (!workspaceId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: stripeConfig } = await supabase
      .from('stripe_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (!stripeConfig?.secret_key_encrypted || !stripeConfig.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Stripe not configured or disabled',
        requiresSetup: true
      }, { status: 400 })
    }

    const secretKey = decryptKey(stripeConfig.secret_key_encrypted)

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: String(amount),
        currency: currency || 'usd',
        'metadata[workspace_id]': workspaceId,
        'metadata[patient_id]': patientId || '',
        'metadata[conversation_id]': conversationId || '',
        description: description || 'Dental consultation deposit'
      })
    })

    const stripeData = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: stripeData.error?.message || 'Stripe API error'
      }, { status: 500 })
    }

    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
        workspace_id: workspaceId,
        patient_id: patientId,
        conversation_id: conversationId,
        amount,
        currency: currency || 'usd',
        status: 'pending',
        stripe_payment_intent_id: stripeData.id,
        description
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        clientSecret: stripeData.client_secret,
        paymentIntentId: stripeData.id
      }
    })
  } catch (error: any) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
