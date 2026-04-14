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
      const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV;
      const defaultUrl = isVercel ? '' : 'http://localhost:3001';
      let serviceUrl = config.service_url || process.env.WHATSAPP_SERVICE_URL || defaultUrl;
      
      if (!serviceUrl) {
        return NextResponse.json({ 
          status: 'disconnected', 
          error: 'No service URL configured.', 
          method: 'qr' 
        })
      }

      // Cleanup URL (strip trailing slash)
      serviceUrl = serviceUrl.replace(/\/$/, '');

      // Proxy to whatsapp-service
      try {
        console.log(`[WhatsApp Proxy] Pinging: ${serviceUrl}/status`);
        const res = await fetch(`${serviceUrl}/status`, { 
          cache: 'no-store',
          signal: AbortSignal.timeout(5000) 
        });
        
        if (!res.ok) {
          throw new Error(`Service responded with status: ${res.status}`);
        }
        
        const data = await res.json();
        return NextResponse.json({ ...data, method: 'qr' })
      } catch (err: any) {
        console.error(`[WhatsApp Proxy Error] ${err.message}`);
        return NextResponse.json({ 
          status: 'disconnected', 
          error: err.message || 'Service Unavailable', 
          method: 'qr', 
          serviceUrl,
          timestamp: new Date().toISOString()
        })
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

