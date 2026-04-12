import { NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const workspace = await supabase.from('workspaces').select('id').limit(1).single()
    
    if (!workspace.data) {
      return NextResponse.json({ 
        status: 'no-workspace',
        message: 'No workspace found in database'
      })
    }

    const workspaceId = workspace.data.id

    const [waConfig, aiConfig] = await Promise.all([
      supabase.from('whatsapp_config').select('*').eq('workspace_id', workspaceId).single(),
      supabase.from('ai_configs').select('*').eq('workspace_id', workspaceId).single()
    ])

    return NextResponse.json({
      status: 'ok',
      workspace: {
        id: workspaceId,
        exists: true
      },
      whatsapp: {
        exists: !!waConfig.data,
        enabled: waConfig.data?.enabled || false,
        hasPhoneNumberId: !!waConfig.data?.phone_number_id,
        hasToken: !!(waConfig.data?.access_token_encrypted || waConfig.data?.access_token),
        hasBusinessId: !!waConfig.data?.whatsapp_business_id,
        verifyToken: waConfig.data?.webhook_verify_token || null
      },
      ai: {
        exists: !!aiConfig.data,
        hasApiKey: !!(aiConfig.data?.api_key_encrypted),
        provider: aiConfig.data?.provider || null,
        model: aiConfig.data?.model || null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 })
  }
}