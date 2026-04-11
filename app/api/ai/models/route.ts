import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 })
    }

    let models: { id: string, name: string }[] = []

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      if (res.ok) {
        const data = await res.json()
        models = data.data
          .filter((m: any) => m.id.includes('gpt'))
          .map((m: any) => ({ id: m.id, name: m.id.toUpperCase() }))
      } else {
        const err = await res.json()
        return NextResponse.json({ success: false, error: err.error?.message || 'OpenAI API Error' }, { status: res.status })
      }
    } else if (provider === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (res.ok) {
        const data = await res.json()
        models = data.models
          .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => ({ 
            id: m.name.replace('models/', ''), 
            name: m.displayName 
          }))
      } else {
        const err = await res.json()
        return NextResponse.json({ success: false, error: err.error?.message || 'Google API Error' }, { status: res.status })
      }
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      if (res.ok) {
        const data = await res.json()
        models = data.data.map((m: any) => ({ id: m.id, name: m.name || m.id }))
      } else {
        const err = await res.json()
        return NextResponse.json({ success: false, error: err.error?.message || 'OpenRouter API Error' }, { status: res.status })
      }
    }

    return NextResponse.json({ success: true, models })

  } catch (error: any) {
    console.error('Model Fetch Proxy Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
