import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single()
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, datetime, treatment, duration, status, notes, patients(name, phone)')
      .eq('workspace_id', workspace.id)
      .order('datetime', { ascending: true })

    if (!appointments || appointments.length === 0) {
      return new NextResponse('id,patient_name,patient_phone,datetime,treatment,duration,status,notes\n', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="appointments.csv"',
        },
      })
    }

    const headers = ['id', 'patient_name', 'patient_phone', 'datetime', 'treatment', 'duration', 'status', 'notes']
    const rows = appointments.map(a => {
      const patient = a.patients as any
      return [
        a.id,
        patient?.name ?? '',
        patient?.phone ?? '',
        a.datetime,
        a.treatment ?? '',
        a.duration ?? '',
        a.status ?? '',
        a.notes ?? '',
      ].map(v => `"${v.toString().replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="appointments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
