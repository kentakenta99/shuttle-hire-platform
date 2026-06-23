# 環境変数
**最終更新:** 2026-06-23

## 必須（未設定だと起動不可）

| 変数名 | 用途 | 使用箇所 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | 全クライアント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（公開可） | 全クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（⚠️ サーバーサイド専用） | admin/service client |
| `RESEND_API_KEY` | メール送信 | `lib/email.ts` |
| `CRON_SECRET` | `/api/cron/notify-departure` の認証トークン | `route.ts:12` |

## フライト情報（未設定だとフライト機能が無音で壊れる）

| 変数名 | 用途 | 使用箇所 |
|---|---|---|
| `AVIATIONSTACK_API_KEY` | ドライバーUIのフライト情報取得 | `app/api/validate-flight` |
| `OAG_API_KEY` | フライト番号検索・出発警告（Primary） | `app/api/search-flights` |
| `OAG_API_KEY_SECONDARY` | OAG フェイルオーバー用（Secondary） | `app/api/search-flights` |

## AI・メール設定（未設定だと該当機能が無効化）

| 変数名 | 用途 | 使用箇所 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ALPO（AI設定アシスタント）| `/admin/superadmin/settings/agent` |
| `EMAIL_FROM` | メール送信元アドレス（省略時: `東京エムケイ シャトルハイヤー <noreply@tokyomk.com>`） | `lib/email.ts:3` |

## URL設定

| 変数名 | 用途 | デフォルト |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | 出発リマインダーメール内の確認URL生成 | `https://shuttle.tokyomk.com` |

## Phase 4追加（Booknetics連携・未実装）

| 変数名 | 用途 |
|---|---|
| `BOOKNETICS_USERNAME` | Booknetics API ユーザー名 |
| `BOOKNETICS_PASSWORD` | Booknetics API パスワード |
| `BOOKNETICS_BASE_URL` | `https://mktaximod.demowebsites.net` |

---

## .env.local テンプレート（新規セットアップ時にコピー）

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# メール
RESEND_API_KEY=
EMAIL_FROM=東京エムケイ シャトルハイヤー <noreply@tokyomk.com>

# フライト情報
AVIATIONSTACK_API_KEY=
OAG_API_KEY=
OAG_API_KEY_SECONDARY=

# AI
ANTHROPIC_API_KEY=

# Cron / URL
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://shuttle.tokyomk.com
```

---

## Vercel での確認方法

```bash
vercel env ls
```

`CRON_SECRET` が production に存在しない場合、出発リマインダーCronが誰でも叩ける状態になる。
必ず設定されていることを確認すること。
