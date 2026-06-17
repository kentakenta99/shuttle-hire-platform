# 環境変数

## 必須

| 変数名 | 用途 | 必須 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（サーバーサイドのみ） | ✅ |
| `RESEND_API_KEY` | メール送信 | ✅ |

## Phase 4追加（Booknetics連携）

| 変数名 | 用途 | 必須 |
|---|---|---|
| `BOOKNETICS_USERNAME` | Booknetics API ユーザー名 | Phase 4 |
| `BOOKNETICS_PASSWORD` | Booknetics API パスワード | Phase 4 |
| `BOOKNETICS_BASE_URL` | `https://mktaximod.demowebsites.net` | Phase 4 |

## .env.local テンプレート

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```
