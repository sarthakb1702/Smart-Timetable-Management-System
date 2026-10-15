import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessRoute, getDefaultDashboardRoute, type UserRole } from './lib/role-guards'

export default async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  const pathname = request.nextUrl.pathname

  console.log('Middleware:', pathname, 'User:', user?.email || 'none')

  // Helper to safely redirect while carrying over any updated cookies!
  const redirectWithCookies = (targetUrl: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetUrl
    const redirectResponse = NextResponse.redirect(url)
    // Transfer cookies updated by Supabase inside supabaseResponse to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Protected route prefixes that require auth
  const protectedPrefixes = [
    '/superadmin',
    '/college-tt-coordinator',
    '/dept-tt-coordinator',
    '/hod',
    '/faculty',
    '/student',
  ]

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    console.log('Middleware: No user, redirecting to login')
    return redirectWithCookies('/login')
  }

  // Redirect logged-in users away from the login page
  if (user && pathname === '/login') {
    console.log('Middleware: User logged in on login page, letting client handle redirect')
    // Let client-side handle role-based redirect
    return supabaseResponse
  }

  // Enforce role-based route access server-side (DEC-10).
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile?.role ?? null) as UserRole | null

    if (!canAccessRoute(role, pathname)) {
      const fallback = role ? getDefaultDashboardRoute(role) : '/login'
      console.log('Middleware: Access denied for role', role, 'on', pathname, '->', fallback)
      return redirectWithCookies(fallback)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}