import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護プレフィックス → 未認証時のリダイレクト先
const AUTH_ROUTES: { prefix: string; login: string }[] = [
  { prefix: '/hotel', login: '/hotel/login' },
  { prefix: '/admin', login: '/admin/login' },
  { prefix: '/driver', login: '/driver/login' },
]

// ログインページ自体やパブリックルート（チェック不要）
const PUBLIC_PREFIXES = ['/hotel/login', '/admin/login', '/driver/login', '/confirm', '/request']

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

  // getUser() でサーバー側検証 + アクセストークンの自動リフレッシュ。
  // リフレッシュ後の新トークンは setAll 経由でレスポンス Cookie に書き込まれる。
  // getSession() はネットワーク呼び出しをしないためリフレッシュできない（使わない）。
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // パブリックパスはそのまま通す
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return response
  }

  // 保護ルート: セッションなし → ログインへ。
  // ロール認可（hotel_staff / tmk_admin / driver の区別）は各 layout.tsx で行う。
  // ここで DB クエリを追加すると、一時的なDB遅延でセッション正常でもログイン画面に
  // 飛ばされる "突然ログアウト" が発生するため実施しない。
  for (const route of AUTH_ROUTES) {
    if (pathname.startsWith(route.prefix)) {
      if (!user) {
        return NextResponse.redirect(new URL(route.login, request.url))
      }
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
