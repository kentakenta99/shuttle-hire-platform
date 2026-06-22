# MKシャトルハイヤー予約プラットフォーム

**東京MK向けホテルシャトルハイヤー予約B2Bシステム。**  
ホテル宿泊客の成田空港行きシャトルハイヤーを、ホテルスタッフ・ゲスト・ドライバーが一つのプラットフォームで管理する。

- **本番URL**: https://shuttle-hire-platform.vercel.app  
- **初期パートナー**: ホテルオークラ東京  
- **ステータス**: Beta / 本番稼働中

---

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [仕様書 v3.0](docs/spec/specification.md) | 要件定義・機能仕様・DBスキーマ・画面一覧・フェーズ計画 |
| [変更履歴](docs/spec/changelog.md) | バージョン別の変更内容 |
| [システムアーキテクチャ](docs/architecture/system_architecture.md) | APIルート・外部サービス・データフロー |
| [DOS連携マッピング](docs/architecture/dos_mapping.md) | Dispatch OSとのデータモデル対応表 |
| [環境変数](docs/operations/env_variables.md) | 全環境変数・用途・必須/任意 |
| [ホテルスタッフ向けガイド](docs/guides/hotel_staff.md) | 予約・キャンセル・QRコードの操作手順 |
| [ドライバー向けガイド](docs/guides/driver.md) | 乗車リスト確認・QRスキャン・ターミナル案内 |
| [内部コンテキスト（社内限定）](docs/internal/internal_business_context.md) | 事業背景・戦略情報 |

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) / TypeScript / Tailwind CSS |
| DB | Supabase PostgreSQL + Realtime + Auth |
| ホスティング | Vercel（GitHub連携 CI/CD） |
| メール | Resend |
| フライト情報 | AviationStack API / OAG API |
| AI設定アシスタント | Anthropic Claude API |

---

## ロール設計

| ロール | 権限 | 認証 |
|---|---|---|
| `hotel_staff` | 自ホテルの予約CRUD | `hotels.auth_user_id` |
| `tmk_admin` | 全データ管理・ドライバーアサイン | `tmk_admin_users` テーブル |
| `driver` | 担当便のみ参照・乗車確認 | `driver_users` テーブル |
| `super_admin` | ユーザーCRUD・売上ダッシュボード | `is_super_admin` フラグ |

---

## ブランチ戦略

- `main` — 本番。直接コミット禁止
- `feature/xxx` — 機能単位のブランチ → PR → main

---

## 開発依頼・Issue

GitHub Issues を使用。テンプレートから選択する。

- バグ報告 → `bug` テンプレート
- 機能追加依頼 → `feature-request` テンプレート
- 仕様変更依頼 → `spec-change` テンプレート

---

## 関係者

- **東京MK**: プロダクトオーナー・運用
- **ENG（開発責任者）**: 仕様書・実装・ドキュメント管理
- **ホテルオークラ東京**: 初期パートナー
