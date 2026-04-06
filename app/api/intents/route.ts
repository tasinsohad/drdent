import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function calculateIntentMatch(query: string, patterns: string[]): { matched: boolean; pattern: string; confidence: number } {
  const queryLower = query.toLowerCase()
  let bestMatch = { matched: false, pattern: '', confidence: 0 }

  for (const pattern of patterns) {
    const patternLower = pattern.toLowerCase()
    
    if (queryLower === patternLower) {
      return { matched: true, pattern, confidence: 1.0 }
    }
    
    if (queryLower.includes(patternLower)) {
      const confidence = patternLower.length / queryLower.length
      if (confidence > bestMatch.confidence) {
        bestMatch = { matched: true, pattern, confidence }
      }
    }

    const words = patternLower.split(/\s+/)
    const matchingWords = words.filter(word => queryLower.includes(word))
    const wordConfidence = words.length > 0 ? matchingWords.length / words.length : 0
    
    if (wordConfidence > bestMatch.confidence && wordConfidence >= 0.5) {
      bestMatch = { matched: true, pattern, confidence: wordConfidence }
    }
  }

  return bestMatch
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const query = searchParams.get('query')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: intents, error } = await supabase
    .from('ai_intents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!query) {
    return NextResponse.json({ intents: intents || [] })
  }

  const matches = (intents || []).map(intent => {
    const match = calculateIntentMatch(query, intent.trigger_patterns)
    return {
      ...intent,
      matchConfidence: match.confidence,
      matchedPattern: match.pattern,
      isMatch: match.matched && match.confidence >= intent.confidence_threshold
    }
  }).filter(i => i.isMatch)
    .sort((a, b) => b.matchConfidence - a.matchConfidence)

  return NextResponse.json({
    intents: matches,
    allIntents: intents
  })
}

export async function POST(request: Request) {
  try {
    const { workspaceId, name, triggerPatterns, responseTemplate, actionType, confidenceThreshold } = await request.json()

    if (!workspaceId || !name || !triggerPatterns || !responseTemplate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: intent, error } = await supabase
      .from('ai_intents')
      .insert({
        workspace_id: workspaceId,
        name,
        trigger_patterns: triggerPatterns,
        response_template: responseTemplate,
        action_type: actionType || 'info',
        confidence_threshold: confidenceThreshold || 0.7
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ intent })
  } catch (error: any) {
    console.error('Create intent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, workspaceId, name, triggerPatterns, responseTemplate, actionType, confidenceThreshold, enabled } = await request.json()

    if (!id || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (triggerPatterns !== undefined) updateData.trigger_patterns = triggerPatterns
    if (responseTemplate !== undefined) updateData.response_template = responseTemplate
    if (actionType !== undefined) updateData.action_type = actionType
    if (confidenceThreshold !== undefined) updateData.confidence_threshold = confidenceThreshold
    if (enabled !== undefined) updateData.enabled = enabled

    const { data: intent, error } = await supabase
      .from('ai_intents')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ intent })
  } catch (error: any) {
    console.error('Update intent error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const workspaceId = searchParams.get('workspaceId')

  if (!id || !workspaceId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('ai_intents')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
