import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedMethod = searchParams.get('method')

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .limit(1)
      .single()

    if (!config) {
      return NextResponse.json({ status: 'disconnected' })
    }

    // Determine which method to check: 
    // If a method is requested, use it. Otherwise use the one from config.
    const methodToCheck = requestedMethod || config.connection_method || 'meta'

    if (methodToCheck === 'qr') {
      const serviceUrl = config.service_url || process.env.WHATSAPP_SERVICE_URL;
      if (!serviceUrl) {
        return NextResponse.json({ status: 'disconnected', error: 'No service URL', method: 'qr' })
      }

      // Proxy to whatsapp-service
      try {
        const res = await fetch(`${serviceUrl}/status`)
        const data = await res.json()
        return NextResponse.json({ ...data, method: 'qr' })
      } catch (err: any) {
        return NextResponse.json({ status: 'disconnected', error: 'Service Unavailable', method: 'qr' })
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

