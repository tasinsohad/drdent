import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Handle missing env vars gracefully
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    return NextResponse.next()
  }

  const tokenCookie = request.cookies.get('sb-access-token')
  const token = tokenCookie?.value

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/admin/login'
  const isPublicRoute = pathname === '/'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  if (!token) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (!isAuthRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // If Supabase is not configured, redirect to login
  if (!supabase) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    const response = NextResponse.redirect(
      isAdminRoute ? new URL('/admin/login', request.url) : new URL('/login', request.url)
    )
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
  }

  if (isAuthRoute) {
    return NextResponse.redirect(new URL('/conversations', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
