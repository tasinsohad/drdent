import { NextRequest, NextResponse } from 'next/server'

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

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/admin/login'
  const isPublicRoute = pathname === '/'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isPublicRoute || isAuthRoute || pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
