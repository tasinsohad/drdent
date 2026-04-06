import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const rateLimit = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxRequests = 30

  const record = rateLimit.get(ip)
  if (!record) {
    rateLimit.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (now - record.timestamp > windowMs) {
    rateLimit.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (record.count >= maxRequests) {
    return true
  }

  record.count += 1
  return false
}

function chunkText(text: string, chunkSize: number = 500): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim())
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const query = searchParams.get('query')

  if (!workspaceId || !query) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: documents, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'ready')

  if (error || !documents || documents.length === 0) {
    return NextResponse.json({ results: [], source: 'none' })
  }

  const queryLower = query.toLowerCase()
  const relevantChunks: { chunk: string; docName: string; docId: string; score: number }[] = []

  for (const doc of documents) {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      for (const chunk of doc.chunks) {
        const chunkLower = chunk.toLowerCase()
        let score = 0

        const queryWords = queryLower.split(' ')
        for (const word of queryWords) {
          if (chunkLower.includes(word)) score += 0.25
        }

        const exactPhrases = queryLower.match(/"[^"]+"/g)
        if (exactPhrases) {
          for (const phrase of exactPhrases) {
            if (chunkLower.includes(phrase.replace(/"/g, ''))) {
              score += 0.5
            }
          }
        }

        if (score > 0) {
          relevantChunks.push({
            chunk,
            docName: doc.name,
            docId: doc.id,
            score
          })
        }
      }
    }
  }

  relevantChunks.sort((a, b) => b.score - a.score)
  const topResults = relevantChunks.slice(0, 3)

  return NextResponse.json({
    results: topResults.map(r => r.chunk),
    sources: topResults.map(r => ({ docName: r.docName, docId: r.docId, score: r.score })),
    source: topResults.length > 0 ? 'knowledge_base' : 'none'
  })
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const workspaceId = formData.get('workspaceId') as string

    if (!file || !workspaceId) {
      return NextResponse.json({ error: 'Missing file or workspaceId' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const fileName = `${workspaceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('knowledge-base')
      .upload(fileName, file)

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('knowledge-base')
      .getPublicUrl(fileName)

    let content = ''
    if (fileExt === 'txt' || fileExt === 'md') {
      content = await file.text()
    }

    const chunks = fileExt !== 'pdf' ? chunkText(content) : []

    const { data: doc, error: dbError } = await supabase
      .from('knowledge_base')
      .insert({
        workspace_id: workspaceId,
        name: file.name,
        file_type: fileExt === 'md' ? 'md' : fileExt,
        file_url: publicUrl,
        content: content.substring(0, 10000),
        chunks,
        status: fileExt === 'pdf' ? 'processing' : 'ready'
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      id: doc.id,
      name: doc.name,
      status: doc.status,
      url: publicUrl
    })
  } catch (error: any) {
    console.error('Knowledge base upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('id')
  const workspaceId = searchParams.get('workspaceId')

  if (!docId || !workspaceId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: doc } = await supabase
    .from('knowledge_base')
    .select('file_url')
    .eq('id', docId)
    .single()

  if (doc?.file_url) {
    const fileName = doc.file_url.split('/storage/v1/object/knowledge-base/')[1]
    if (fileName) {
      await supabase.storage.from('knowledge-base').remove([fileName])
    }
  }

  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', docId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
