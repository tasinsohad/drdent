import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessToken, refreshToken } = await request.json()

    const response = NextResponse.json({ success: true })

    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    })

    response.cookies.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to set cookies' }, { status: 500 })
  }
}
