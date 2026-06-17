import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護ルートとそのロール要件
const PROTECTED_ROUTES: { prefix: string; role: string; login: string }[] = [
  { prefix: '/hotel', role: 'hotel_staff', login: '/hotel/login' },
  { prefix: '/admin', role: 'tmk_admin', login: '/admin/login' },
  { prefix: '/driver', role: 'driver', login: '/driver/login' },
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションリフレッシュ（必ず getUser を呼ぶこと）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  for (const route of PROTECTED_ROUTES) {
    // ログインページ自体はスキップ
    if (pathname === route.login) continue

    if (pathname.startsWith(route.prefix)) {
      if (!user) {
        return NextResponse.redirect(new URL(route.login, request.url))
      }
      // ロール確認は Server Component 側で行う（RLS で保護済み）
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
