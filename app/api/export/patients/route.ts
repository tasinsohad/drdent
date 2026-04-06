import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get workspace
    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single()
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

    const { data: patients } = await supabase
      .from('patients')
      .select('id, name, phone, email, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (!patients || patients.length === 0) {
      return new NextResponse('id,name,phone,email,created_at\n', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="patients.csv"',
        },
      })
    }

    const headers = ['id', 'name', 'phone', 'email', 'created_at']
    const rows = patients.map(p =>
      headers.map(h => `"${(p[h as keyof typeof p] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="patients-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
