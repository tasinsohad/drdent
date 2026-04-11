import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model, messages, systemPrompt } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 })
    }

    if (provider === 'openai' || provider === 'openrouter') {
      const baseUrl = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1'
      
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      })

      const data = await res.json()
      if (res.ok) {
        return NextResponse.json({ success: true, reply: data.choices?.[0]?.message?.content })
      } else {
        return NextResponse.json({ success: false, error: data.error?.message || 'AI Provider Error' }, { status: res.status })
      }

    } else if (provider === 'google') {
      const geminiHistory = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      // The last message is usually the User message in this flow
      const lastMsg = geminiHistory.pop()

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...geminiHistory,
            lastMsg
          ],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      })

      const data = await res.json()
      if (res.ok) {
        return NextResponse.json({ success: true, reply: data.candidates?.[0]?.content?.parts?.[0]?.text })
      } else {
        return NextResponse.json({ success: false, error: data.error?.message || 'Google API Error' }, { status: res.status })
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported provider' }, { status: 400 })

  } catch (error: any) {
    console.error('Proxy Chat Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
