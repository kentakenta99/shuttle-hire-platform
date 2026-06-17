@AGENTS.md

# Shuttle Hire Platform — Claude Code Settings

## プロジェクト概要
東京MK向けホテルシャトルハイヤー予約プラットフォーム。
ホテルオークラ東京を初期パートナーとした B2B 予約システム。

## 要件定義書
`docs/requirements/07_shuttle_hire_platform.md`（v1.3）を必ず参照してから実装に入ること。

## 技術スタック
- Frontend: Next.js 16 (App Router) / TypeScript / Tailwind CSS
- DB: Supabase (PostgreSQL + Realtime + Auth + Storage)
- Hosting: Vercel
- Email: Resend

## ロール設計（3ロール）
- `hotel_staff`：ホテル共有アカウント（1ホテル1アカウント）。`hotels.auth_user_id` で判定
- `tmk_admin`：TMK管理者。`tmk_admin_users` テーブルで判定
- `driver`：ドライバー。`driver_users` テーブルで判定（`employee_code` ブリッジキー）

## DBルール
- RLSポリシーを必ず確認してからクエリを書く
- マイグレーションは `supabase/migrations/` に連番SQLで管理
- `shuttle_slots.status` の値：`open / full / closed / suspended`（`cancelled` は使わない）
- `bookings.status` の値：`confirmed / cancelled / completed`
- `cancelled` = 乗客都合のキャンセル。便の運休は `suspended`（混同禁止）

## ブランチ戦略
- `main`：本番。直接コミット禁止
- `feature/xxx`：機能単位のブランチ。PR → main

## コーディング規約
- TypeScript 必須、any 禁止
- コンポーネントは function 宣言（アロー関数不可）
- export は default export
- コメントは日本語可

## 作業開始時
1. `docs/requirements/07_shuttle_hire_platform.md` の該当セクションを確認
2. 対応する GitHub Issue を確認・着手中にステータス更新
3. 実装 → `docs/` の該当ファイルを同じコミットで更新

## やってはいけないこと
- `hotel_staff_users` テーブルへの参照（削除済み・`hotels.auth_user_id` を使う）
- `shuttle_slots.status = 'cancelled'`（`suspended` を使う）
- ハードコードされた API キー・シークレット
