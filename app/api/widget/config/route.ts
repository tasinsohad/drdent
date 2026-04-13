import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Get widget config by embed_token
    const { data: config, error: configError } = await supabase
      .from('widget_config')
      .select('*, workspaces(name)')
      .eq('embed_token', token)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (!config.enabled) {
      return NextResponse.json({ error: 'Widget disabled' }, { status: 403 })
    }

    return NextResponse.json({
      workspaceId: config.workspace_id,
      workspaceName: config.workspaces?.name || 'Dr. Dent Assistant',
      primaryColor: config.primary_color || '#0ea5e9',
      greetingText: config.greeting_text || 'Hi! How can we help you today?',
      position: config.position || 'bottom-right'
    })

  } catch (err: any) {
    console.error('Widget Config API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
