import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  if (pathname.startsWith('/admin')) {
    if (pathname.includes('/admin/login')) {
      return NextResponse.next()
    }
    
    const adminSession = request.cookies.get('admin_session')
    
    if (!adminSession || adminSession.value !== 'true') {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}
