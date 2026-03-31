import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Verificar se a rota é administrativa
  if (pathname.startsWith('/admin')) {
    // 2. Exceção para a página de login para evitar loop de redirecionamento
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }
    
    // 3. Verificar o cookie de sessão
    const adminSession = request.cookies.get('admin_session')
    
    if (!adminSession || adminSession.value !== 'true') {
      // Redirecionar para o login se não houver uma sessão de administrador ativa
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

// Configurar o matcher para interceptar apenas as rotas do painel administrativo
export const config = {
  matcher: '/admin/:path*'
}
