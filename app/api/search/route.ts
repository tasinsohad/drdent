import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase() || ''
    
    if (!query || query.length < 2) {
      return NextResponse.json({ patients: [], appointments: [], conversations: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single()
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

    // Quick parallel search via direct partial match
    // For production with large sets, consider pg_trgm or full-text, but ilike is fine for MVP SaaS
    
    // 1. Search patients by name or phone
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone, email')
      .eq('workspace_id', workspace.id)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5)

    // 2. Search appointments by treatment
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, datetime, treatment, status, patients(name)')
      .eq('workspace_id', workspace.id)
      .ilike('treatment', `%${query}%`)
      .limit(5)

    return NextResponse.json({
      patients: patients || [],
      appointments: appointments || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
