# System Architecture v3.2
**最終更新:** 2026-06-23

## 概要
東京MK向けホテルシャトルハイヤー予約プラットフォーム。
仕様書: `docs/spec/specification.md` (v3.2)

---

## URL構成

### ホテルスタッフ（認証必須）
| パス | 説明 |
|---|---|
| `/hotel/login` | ホテルログイン |
| `/hotel/calendar` | 出発枠カレンダー・残席リアルタイム表示（TOP） |
| `/hotel/book/[slotId]` | 予約入力フォーム |
| `/hotel/book/[slotId]/confirm` | QRコード表示・電子署名 |
| `/hotel/bookings` | 予約履歴（直近30日） |
| `/hotel/bookings/[id]` | 予約詳細・キャンセル |
| `/hotel/requests` | ゲスト自己申請の承認一覧 |
| `/hotel/faq` | ホテルスタッフ向けFAQ |

### ゲスト（認証不要・公開）
| パス | 説明 |
|---|---|
| `/confirm/[bookingReference]` | ゲスト確認ページ（QRチケット・キャンセル・出発警告） |
| `/lookup` | 確認番号手入力で予約検索 |
| `/request/[slug]` | ゲスト自己申請フォーム（ホテルslug指定） |

### TMK管理者（認証必須）
| パス | 説明 |
|---|---|
| `/admin/login` | 管理者ログイン |
| `/admin` | ダッシュボード（今日・明日の枠・予約状況） |
| `/admin/slots` | 出発枠一覧 |
| `/admin/slots/new` | 出発枠作成（単発・繰り返し） |
| `/admin/slots/[id]` | 出発枠詳細・ドライバーアサイン・乗車リスト |
| `/admin/bookings` | 全予約一覧（フィルタ・CSV出力） |
| `/admin/bookings/[id]` | 予約詳細・管理者編集 |
| `/admin/hotels` | ホテルマスター管理 |
| `/admin/invoices` | 月次請求レポート |
| `/admin/security` | 認証ログ・不審IP監視 |
| `/admin/superadmin` | 売上ダッシュボード（super_adminのみ） |
| `/admin/superadmin/users` | ユーザーCRUD（super_adminのみ） |
| `/admin/superadmin/settings` | キャンセルポリシー設定・ALPO |

### ドライバー（認証必須）
| パス | 説明 |
|---|---|
| `/driver/login` | ドライバーログイン |
| `/driver` | 本日の担当便一覧 |
| `/driver/slots/[id]` | 乗車リスト・フライト情報・QRスキャン・ターミナル案内 |

### API Routes
| パス | 説明 |
|---|---|
| `/api/validate-flight` | フライト番号バリデーション（AviationStack） |
| `/api/search-flights` | フライト番号不明時のOAG検索 |
| `/api/admin/bookings/csv` | 予約CSV出力（tmk_admin専用） |
| `/api/cron/notify-departure` | 出発14〜16分前リマインダー（Vercel Cron・CRON_SECRET保護） |

---

## DBスキーマ（主要テーブル）

| テーブル | 概要 |
|---|---|
| `hotels` | ホテルマスター（1ホテル1アカウント） |
| `shuttle_slots` | 出発枠（在庫）。status: open/full/closed/suspended |
| `service_orders` | 予約受注（v3.2: bookings→service_orders）。booking_reference で識別 |
| `driver_assignments` | ドライバーアサイン（employee_code ブリッジキー） |
| `cancel_otps` | ゲストキャンセル用OTP（SHA-256ハッシュ保存・10分有効） |
| `cancellation_policies` | キャンセルポリシー（ホテル別 + グローバルデフォルト） |
| `auth_events` | 認証ログ（セキュリティ監視用） |
| `tmk_admin_users` | TMK管理者テーブル |
| `driver_users` | ドライバーテーブル（employee_code） |
| `monthly_invoices` | 月次請求サマリー |
| `booking_requests` | ゲスト自己申請（ホテル承認待ち） |

---

## 外部サービス

| サービス | 用途 | 環境変数 |
|---|---|---|
| Supabase Auth | JWT認証（3ロール） | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase PostgreSQL | メインDB + RLS | `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase Realtime | 残席リアルタイム同期 | — |
| Supabase Storage | 電子署名画像保存 | — |
| Supabase pg_cron | cancel_otps 自動削除（毎日18:00 UTC = 3時JST） | — |
| Resend | 全メール送信（予約確認・OTP・リマインダー・キャンセル） | `RESEND_API_KEY`, `EMAIL_FROM` |
| AviationStack API | ドライバーUIフライト情報（⚠️ HTTPのみ・フリープラン） | `AVIATIONSTACK_API_KEY` |
| OAG Flight Info API | フライト番号検索・出発警告 | `OAG_API_KEY`, `OAG_API_KEY_SECONDARY` |
| Anthropic Claude API | ALPO（AI設定アシスタント） | `ANTHROPIC_API_KEY` |
| Vercel | ホスティング・CI/CD・Cron | `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` |

---

## 認証フロー

```
[ブラウザ] → Supabase Auth（JWT）→ Supabase SSR Cookie → Server Component
                                                          ↓
                                              RLS: current_user_role() で分岐
                                              - hotel_staff: hotels.auth_user_id
                                              - tmk_admin:   tmk_admin_users
                                              - driver:      driver_users
```

---

## メール送信フロー（Email-First Pattern）

```
Server Action
  ↓
1. Resend でメール送信
  ↓ 成功確認
2. DB に INSERT/UPDATE（OTPの場合はここでハッシュ保存）
  ↓ メール失敗時は DB を汚さない
```

---

## 重要な設計メモ

- **service_orders**: v3.2でbookingsからリネーム。DBのRLSポリシー名は旧名 `hotel_staff_own_bookings` のまま（機能は正常。名前のみ不一致）
- **cancel_otps**: RLS `USING (false)` = service_role専用。createAdminClient()経由のみ
- **公開ゲストページ** (`/confirm/[bookingReference]`): Server Component のため createServiceClient() を使用（キーはサーバー側のみ。ブラウザに漏洩しない）
- **AviationStack**: フリープランはHTTPのみ。本番移行時にHTTPS有料プランまたはOAG一本化を推奨

---

## Phase別追加サービス（未実装）

| Phase | サービス | 用途 |
|---|---|---|
| Phase 2 | Supabase Edge Functions | ドライバーアプリAPI |
| Phase 3 | Google Maps Directions API | 複数ホテル停車順最適化 |
| Phase 4 | Booknetics API（DewTouch） | エミレーツ成田便自動カウント |
| Phase 4 | pg_cron（Booknetics同期） | 06:00 JST 自動同期 |
