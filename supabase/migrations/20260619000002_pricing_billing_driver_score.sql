-- ============================================================
-- セミダイナミックプライシング・請求方式・乗務員スコア
-- ============================================================

-- 1. ホテルごとの人数別単価テーブル
CREATE TABLE hotel_pricing_tiers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  party_size       INT  NOT NULL CHECK (party_size >= 1),
  per_person_price INT  NOT NULL CHECK (per_person_price >= 0),
  UNIQUE(hotel_id, party_size)
);
COMMENT ON TABLE hotel_pricing_tiers IS
  'ホテルごとの人数別単価。予約時の unit_price スナップショットのソース。';

ALTER TABLE hotel_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- hotel_staff: 自ホテルのみ参照
CREATE POLICY "hotel_read_own_pricing" ON hotel_pricing_tiers
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE auth_user_id = auth.uid())
  );

-- tmk_admin: 全件操作
CREATE POLICY "admin_all_pricing" ON hotel_pricing_tiers
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM tmk_admin_users WHERE user_id = auth.uid() AND is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM tmk_admin_users WHERE user_id = auth.uid() AND is_active));

-- 2. hotels: 請求方式
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'hotel_invoice'
    CHECK (billing_type IN ('hotel_invoice', 'direct_guest'));

COMMENT ON COLUMN hotels.billing_type IS
  'hotel_invoice=ホテル請求（月次）/ direct_guest=車内現金・カード決済';

-- 3. bookings: 確定時の価格スナップショット
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS unit_price  INT,
  ADD COLUMN IF NOT EXISTS total_price INT;

COMMENT ON COLUMN bookings.unit_price  IS '予約確定時の1人単価（JPY）。pricing_tiersのスナップショット。';
COMMENT ON COLUMN bookings.total_price IS '合計金額 = unit_price × party_size';

-- 4. driver_users: シャトル適格フラグ + スコア
ALTER TABLE driver_users
  ADD COLUMN IF NOT EXISTS is_shuttle_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuttle_score       INT     NOT NULL DEFAULT 0;

COMMENT ON COLUMN driver_users.is_shuttle_eligible IS
  'シャトル便アサイン対象かどうか。スーパー管理者が管理。';
COMMENT ON COLUMN driver_users.shuttle_score IS
  '乗務員スコア（0-100）。高いほど優先的にアサイン候補に表示。';

CREATE INDEX IF NOT EXISTS idx_driver_users_shuttle
  ON driver_users(is_shuttle_eligible, shuttle_score DESC)
  WHERE is_active = true;
