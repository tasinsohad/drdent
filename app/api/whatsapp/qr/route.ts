import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('service_url, connection_method')
      .limit(1)
      .single()

    if (!config || config.connection_method !== 'qr') {
      return NextResponse.json({ error: 'QR Method not active' }, { status: 400 })
    }

    const serviceUrl = config.service_url || process.env.WHATSAPP_SERVICE_URL;
    if (!serviceUrl) {
      return NextResponse.json({ error: 'No service URL configured' }, { status: 400 })
    }

    const res = await fetch(`${serviceUrl}/qr`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
