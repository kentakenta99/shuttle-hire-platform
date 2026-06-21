# シャトルハイヤー ↔ DispatchOS データモデル対応表

シャトルハイヤーとDispatchOSは**別DB・別システム**（PostgreSQL vs Firestore）。
統合予定なし。ブリッジキーで必要な場合のみ紐づける。

## テーブル / コレクション対応

| 概念 | シャトルハイヤー（Supabase） | DispatchOS（Firestore） | 橋渡しキー |
|---|---|---|---|
| 法人顧客 | `hotels` | `accounts`（旧 `customers`） | `hotels.customer_code` |
| 乗務員 | `driver_users` | `drivers` | `driver_users.employee_code`（7桁）/ `driver_code`（8桁） |
| 運行枠 | `shuttle_slots` | `shifts` | なし（独立管理） |
| 予約・乗客 | `bookings`（`guest_name`） | `service_orders` / `riders` 相当 | なし |
| イベントログ | `booking_events` | `shifts/{id}/events (ShiftEvent)` | 構造を合わせて設計 |
| 管理者 | `tmk_admin_users` | DOS管理者（別系統） | なし |

## カラム名の違い（主なもの）

| 概念 | シャトルハイヤー | DispatchOS相当 |
|---|---|---|
| 乗客氏名 | `guest_name` | `rider_name` / `passenger_name` |
| 人数 | `party_size` | `passenger_count` |
| フライト番号 | `flight_number` | `flight_no` |
| 予約ステータス | `confirmed / cancelled / completed` | DOS固有のステータス体系 |

## 方針

- 名称は**揃えない**。シャトルハイヤー固有の用語をそのまま使う。
- DOSとの連携が必要になった場合は**変換レイヤー**（API or ETL）を挟む。
- 橋渡しキー（`customer_code`, `driver_code`）はすでに `dos_alignment` マイグレーション（2026-06-17）で追加済み。
