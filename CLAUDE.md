@AGENTS.md
@PERSONAS.md

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

## 権限設計の鉄則（実装前に必ず実行すること）

新しいロール・テーブル・機能を追加するとき、コードを1行も書く前に以下のマトリクスを埋める。
埋めるまで実装に入ってはならない。「知っているがやらない」はプロの仕事ではない。

### 確認マトリクス（ロール × テーブル × 操作）

| テーブル | hotel_staff | tmk_admin | driver |
|---|---|---|---|
| hotels | SELECT（自分のホテルのみ） | SELECT（全件） | × |
| shuttle_slots | SELECT（全件） | ALL | SELECT（全件） |
| bookings | ALL（自ホテルのみ） | ALL | SELECT（担当便のみ）/ UPDATE（completedへのみ） |
| driver_assignments | × | ALL | SELECT（自分のみ） |
| driver_users | × | SELECT（全件） | SELECT（自分のみ） |
| tmk_admin_users | × | SELECT（自分のみ） | × |

### チェック項目（機能追加・変更のたびに確認）

1. **新しいテーブルを作成したか？** → 全ロールのアクセス可否を決めてRLSポリシーを書く
2. **既存テーブルに新しい操作（INSERT/UPDATE/DELETE）を追加したか？** → そのロールのポリシーにその操作が含まれているか確認
3. **JOINするテーブルが増えたか？** → JOINされる側のテーブルへのSELECT権限がそのロールにあるか確認
4. **RPC（DB関数）を作成・呼び出すか？** → SECURITY DEFINERの場合 `auth.uid()` はNULLになる。p_hotel_id等のパラメータで代替する
5. **サービスロールを使う場合** → 必ず呼び出し元でロール検証してからadminClientを使う（検証なしのサービスロール使用は禁止）

### よくある落とし穴（過去の失敗から）
- `driver_users` に admin の SELECT ポリシーを忘れる → JOINが空になり「未アサイン」表示になる
- driver に bookings の UPDATE ポリシーを忘れる → 乗車確認ボタンが押せても更新されない
- `current_user_role()` 内でRLSが再帰的にかかることがある → EXISTS句のテーブルにも適切なポリシーが必要
- ダッシュボード集計で月末日を `YYYY-MM-31` とハードコード → 30日月でPostgreSQLエラーになりデータが0件になる

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
