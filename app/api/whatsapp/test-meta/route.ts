import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { phone_id, token } = await request.json()
    
    if (!phone_id || !token) {
      return NextResponse.json({ success: false, error: 'Phone ID and Token are required' })
    }

    // Try to decrypt if it seems encrypted, otherwise use as is
    let rawToken = token;
    if (token.includes(':')) {
      try {
        rawToken = decrypt(token);
      } catch (e) {
        // Not encrypted or wrong format
      }
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${phone_id}`, {
      headers: {
        'Authorization': `Bearer ${rawToken}`
      }
    });

    const data = await res.json();

    if (res.ok) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data.error?.message || 'Meta API returned an error' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
