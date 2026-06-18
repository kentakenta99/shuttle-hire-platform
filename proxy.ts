import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護ルートとそのロール要件
const PROTECTED_ROUTES: { prefix: string; role: string; login: string }[] = [
  { prefix: '/hotel', role: 'hotel_staff', login: '/hotel/login' },
  { prefix: '/admin', role: 'tmk_admin', login: '/admin/login' },
  { prefix: '/driver', role: 'driver', login: '/driver/login' },
]

// ロール別にどのテーブルのどのカラムで認証済みユーザーを照合するかを定義
const ROLE_CHECK: Record<string, { table: string; column: string }> = {
  hotel_staff: { table: 'hotels',          column: 'auth_user_id' },
  tmk_admin:   { table: 'tmk_admin_users', column: 'user_id'      },
  driver:      { table: 'driver_users',    column: 'user_id'      },
}

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

  // getUser でサーバー検証 + トークン自動リフレッシュを行う。
  // getSession はネットワーク呼び出しをしないため期限切れJWTをリフレッシュできず、
  // 数分の無操作でもログアウトされる原因になる。
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  for (const route of PROTECTED_ROUTES) {
    // ログインページ自体はスキップ
    if (pathname === route.login) continue

    if (pathname.startsWith(route.prefix)) {
      // 未認証はログインページへ
      if (!user) {
        return NextResponse.redirect(new URL(route.login, request.url))
      }

      // ロール確認: 対象テーブルに該当ユーザーが存在するかチェック
      const check = ROLE_CHECK[route.role]
      if (check) {
        const { data } = await supabase
          .from(check.table)
          .select('id')
          .eq(check.column, user.id)
          .limit(1)
          .maybeSingle()

        if (!data) {
          // 認証済みだがロールが一致しない → 当該ロールのログインページへ
          return NextResponse.redirect(new URL(route.login, request.url))
        }
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
