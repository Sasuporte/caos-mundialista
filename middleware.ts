import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'caos_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api')) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const isPublic = pathname === '/login'

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isPublic && token) {
    return NextResponse.redirect(new URL('/partidos', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
