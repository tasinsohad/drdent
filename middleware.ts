import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_ROUTES = [
  '/conversations',
  '/patients',
  '/appointments',
  '/analytics',
  '/settings',
]

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through: static files, API routes, Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|webp|gif|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // Create a response we can mutate cookies on
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Build SSR Supabase client that reads/writes cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: object) {
          // Mutate request cookies for this request
          request.cookies.set(name, value)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        },
        remove(name: string, options: object) {
          request.cookies.set(name, '')
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set(name, '', options as Parameters<typeof response.cookies.set>[2])
        },
      },
    }
  )

  // Refresh session — this also refreshes the JWT if it is close to expiring
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)
  const isRoot = pathname === '/'

  // Unauthenticated trying to access protected route → login
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated hitting auth route → dashboard
  if (isAuthenticated && (isAuthRoute || isRoot)) {
    return NextResponse.redirect(new URL('/conversations', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
