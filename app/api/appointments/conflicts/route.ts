import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const datetime = searchParams.get('datetime')
  const duration = parseInt(searchParams.get('duration') || '30')
  const dentistId = searchParams.get('dentistId')
  const excludeAppointmentId = searchParams.get('excludeId')

  if (!workspaceId || !datetime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const requestedStart = new Date(datetime)
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 1000)

  let query = supabase
    .from('appointments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .neq('status', 'cancelled')
    .or(`datetime.gte.${requestedStart.toISOString()},datetime.lt.${requestedEnd.toISOString()}`)

  if (dentistId) {
    query = query.eq('dentist_id', dentistId)
  }

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId)
  }

  const { data: conflictingAppointments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const conflicts = (conflictingAppointments || []).filter(apt => {
    const aptStart = new Date(apt.datetime)
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60 * 1000)

    return requestedStart < aptEnd && requestedEnd > aptStart
  })

  if (conflicts.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, name')
      .in('id', conflicts.map(c => c.patient_id).filter(Boolean))

    const conflictsWithDetails = conflicts.map(c => {
      const patient = patients?.find(p => p.id === c.patient_id)
      return {
        id: c.id,
        datetime: c.datetime,
        duration: c.duration,
        treatment: c.treatment,
        status: c.status,
        patientName: patient?.name || 'Unknown',
        location: c.location
      }
    })

    return NextResponse.json({
      hasConflict: true,
      conflicts: conflictsWithDetails,
      message: `Found ${conflicts.length} conflicting appointment(s)`
    })
  }

  return NextResponse.json({
    hasConflict: false,
    conflicts: [],
    available: true
  })
}

export async function POST(request: Request) {
  try {
    const { workspaceId, datetime, duration, dentistId, treatment, patientId, notes } = await request.json()

    console.log('[POST /api/appointments/conflicts] Creating appointment:', { workspaceId, datetime, treatment })

    if (!workspaceId || !datetime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const requestedStart = new Date(datetime)
    const requestedEnd = new Date(requestedStart.getTime() + (duration || 30) * 60 * 1000)

    let query = supabase
      .from('appointments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .neq('status', 'cancelled')
      .or(`datetime.gte.${requestedStart.toISOString()},datetime.lt.${requestedEnd.toISOString()}`)

    if (dentistId) {
      query = query.eq('dentist_id', dentistId)
    }

    const { data: existingConflicts } = await query

    if (existingConflicts && existingConflicts.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Time slot conflicts with existing appointment',
        conflicts: existingConflicts
      }, { status: 409 })
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        workspace_id: workspaceId,
        patient_id: patientId || null,
        dentist_id: dentistId || null,
        datetime: datetime,
        duration: duration || 30,
        treatment: treatment || null,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/appointments/conflicts] Insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('[POST /api/appointments/conflicts] Created:', appointment)

    return NextResponse.json({
      success: true,
      appointment
    })
  } catch (error: any) {
    console.error('[POST /api/appointments/conflicts] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
