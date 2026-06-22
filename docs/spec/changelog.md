# 変更履歴

## v3.0（2026-06-22）

**担当: ENG**

### 追加機能

- **ゲストセルフキャンセル**: ゲスト確認ページからセルフキャンセル可能に。`GuestCancelButton` コンポーネント実装
- **キャンセルポリシー設定**: `cancellation_policies` テーブル追加。ホテル別 + グローバルデフォルトの二層構造
  - フィールド: `threshold_hours`（締切時間）、`fee_pct`（違約金率）
  - ホテルIDが NULL の場合はグローバルデフォルト
- **スーパー管理者 キャンセルポリシー UI**: ホテル選択 → ポリシー確認 → フォーム編集の CRUD UI
- **AI設定アシスタント（ALPO）**: Claude API 連携。自然言語でキャンセルポリシーを設定変更可能
  - Server Action `processSettingsAgent()` でインテント抽出 → ポリシー自動更新
- **3時間未満出発警告**: `TimeUntilDepartureWarning` コンポーネント。OAGデータの出発時刻と現在時刻を比較し、3時間を切ったら黄色バナーとカウントダウンを表示
- **フライト検索（Lazy Search）**: `FlightNumberInput` に「Are you too lazy to check your flight number?」フロー追加
  - エアライン名 + 時間帯 or 目的地で成田出発便をリアルタイム検索
  - 全エアライン対応（IATAコード・航空会社名どちらでも）
- **MKドアロゴ表示**: ゲストチケットの車両情報欄にMKマーク画像（`/mk-door-logo.avif`）を追加
- **フロント問い合わせCTA**: 電話番号を削除し「フロントまでお気軽にお問い合わせください」に統一
- **メールキャンセル通知**: `sendGuestCancellationEmail()` でキャンセル時に確認メールを送信

### DB変更

```sql
-- cancellation_policies テーブル追加
CREATE TABLE cancellation_policies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid REFERENCES hotels(id),  -- NULL = グローバルデフォルト
  threshold_hours  numeric(4,1) NOT NULL DEFAULT 2,
  fee_pct          int NOT NULL DEFAULT 25,
  note             text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by_name  text,
  UNIQUE(hotel_id)
);

-- bookings テーブル追加カラム
ALTER TABLE bookings ADD COLUMN cancellation_fee int;
```

### APIルート変更

- `GET /api/search-flights` — 新規追加（フライト番号不明ゲスト向けサーチ）

---

## v2.0（2026-06-18）

**担当: ENG**

- Phase 1 完了。`https://shuttle-hire-platform.vercel.app` 本番稼働開始
- 出発時刻制約を撤廃（任意時刻設定可能）
- AviationStack API 統合（フライト情報・ターミナル・遅延）
- ターミナル自動停車順（T1/T2 最適停車順を自動算出）
- スーパー管理者機能追加（`is_super_admin` フラグ・CRUD・売上ダッシュボード）
- セキュリティ監視機能（`auth_events` テーブル・不審IP検出）
- QRチケットに車両ナンバー表示（`vehicle_plate`）
- ドライバーUIのラベル変更: 「乗務員コード」→「社員番号」
- 乗務員マスタはDOS参照。新規作成ボタンを廃止

---

## v1.4（2026-06-17）

- 内部コンテキストを `docs/internal/internal_business_context.md` に分離
- スロット運用ルール確定（デフォルト3台/日・前日17時公開）
- ゼロ予約キャンセルフロー確定

---

## v1.3（2026-05-13）

- Phase 4追加: Booknetics API統合仕様
- `driver_users.is_emirates_route` フラグ追加
- `booknetics_sync_logs` テーブル追加

---

## v1.2（2026-05-13）

- R1〜R8 全運用ルール確定
- ゲスト確認方式: QRコード＋公開確認ページ・電子署名

---

## v1.0（2026-06-初旬）

- 初版リリース。全3ロールUI（ホテル / 管理者 / 乗務員）
- 出発枠CRUD・予約CRUD・QRチケット発行
