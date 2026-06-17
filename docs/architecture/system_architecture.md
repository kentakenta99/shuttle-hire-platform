# System Architecture

## 概要
TMKシャトルハイヤー予約プラットフォーム。
要件定義書: `docs/requirements/07_shuttle_hire_platform.md` (v1.3)

## URL構成

| パス | ロール | 説明 |
|---|---|---|
| `/login` | hotel_staff | ホテルログイン |
| `/` | hotel_staff | カレンダー・残席表示 |
| `/book/[slotId]` | hotel_staff | 予約入力 |
| `/book/[slotId]/confirm` | hotel_staff | QRコード表示・電子署名 |
| `/confirm/[confirmationCode]` | 公開 | ゲスト確認ページ |
| `/admin` | tmk_admin | 管理ダッシュボード |
| `/admin/slots` | tmk_admin | 出発枠管理 |
| `/admin/bookings` | tmk_admin | 予約一覧 |
| `/admin/hotels` | tmk_admin | ホテル管理 |
| `/admin/invoices` | tmk_admin | 請求管理 |
| `/driver` | driver | 本日の担当便 |
| `/driver/slots/[id]` | driver | 乗車リスト |

## 外部サービス

| サービス | 用途 |
|---|---|
| Supabase Auth | JWT認証（hotel_staff / tmk_admin / driver） |
| Supabase Realtime | 残席リアルタイム同期 |
| Supabase Storage | 電子署名画像保存 |
| Resend | 予約確認・通知メール |
| Vercel | ホスティング・CI/CD |

## Phase 4（将来）
Booknetics API (DewTouch) と連携してエミレーツ成田便を自動カウント。
詳細: 要件定義書 Section 14
