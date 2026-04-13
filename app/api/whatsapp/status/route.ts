import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1)
      .single()

    if (!config) {
      return NextResponse.json({ status: 'disconnected' })
    }

    if (config.connection_method === 'qr') {
      const serviceUrl = config.service_url || process.env.WHATSAPP_SERVICE_URL;
      if (!serviceUrl) {
        return NextResponse.json({ status: 'disconnected', error: 'No service URL' })
      }

      // Proxy to whatsapp-service
      try {
        const res = await fetch(`${serviceUrl}/status`)
        const data = await res.json()
        return NextResponse.json(data)
      } catch (err: any) {
        return NextResponse.json({ status: 'disconnected', error: 'Service Unavailable' })
      }
    } else {
      // Meta API method
      return NextResponse.json({ 
        status: config.enabled ? 'ready' : 'disconnected',
        method: 'meta'
      })
    }
  } catch (err: any) {
    return NextResponse.json({ status: 'disconnected', error: err.message }, { status: 500 })
  }
}
