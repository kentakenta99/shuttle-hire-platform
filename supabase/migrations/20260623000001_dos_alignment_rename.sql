-- DOS命名規約アライメント
-- bookings → service_orders
-- confirmation_code → booking_reference
-- + external_refs / dos_sync_status / booking_source カラム追加

-- 1. テーブルリネーム（FK・RLSポリシーは自動追従）
ALTER TABLE bookings RENAME TO service_orders;

-- 2. カラムリネーム
ALTER TABLE service_orders RENAME COLUMN confirmation_code TO booking_reference;
ALTER TABLE cancel_otps RENAME COLUMN confirmation_code TO booking_reference;

-- 3. DOS alignment カラム追加
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS external_refs    jsonb,
  ADD COLUMN IF NOT EXISTS dos_sync_status  text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS booking_source   text NOT NULL DEFAULT 'hotel_staff';

-- dos_sync_status: 'not_applicable' | 'pending' | 'synced' | 'sync_failed'
-- booking_source:  'hotel_staff' | 'guest_request' | 'api_agent'

-- 4. 確認番号生成関数のリネーム
ALTER FUNCTION generate_confirmation_code() RENAME TO generate_booking_reference;

-- 5. インデックスリネーム（保守性のため）
ALTER INDEX IF EXISTS idx_cancel_otps_lookup RENAME TO idx_cancel_otps_booking_ref;
