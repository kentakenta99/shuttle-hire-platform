-- ============================================================
-- DOS整合マイグレーション
-- DOS legacy/types との識別子・イベントログ整合
-- ============================================================

-- driver_users: DOS drivers.driverId（社員コード7桁）を追加
ALTER TABLE driver_users
  ADD COLUMN driver_code text;
-- employee_code = DOS employeeCode (ABCシステム上の乗務員コード)
-- driver_code   = DOS driverId     (社員コード7桁・Firestore Doc ID)
-- DOS D-017: drivers DocID = 8桁ゼロ埋め社員コード（例: "0012345"→"00012345"）
-- employee_code = DOS employeeCode（7桁・ABCシステム/Booknetics乗務員コード）
COMMENT ON COLUMN driver_users.driver_code IS 'DOS drivers コレクションのDocID（8桁ゼロ埋め社員コード。例: "00012345"）。employee_codeはABC/Booknetics乗務員コード（7桁）で別概念。';
CREATE UNIQUE INDEX ON driver_users(driver_code) WHERE driver_code IS NOT NULL;

-- hotels: DOS customers.customerId（顧客コード）を追加
ALTER TABLE hotels
  ADD COLUMN customer_code text;
-- DOS v12: customers → accounts にリネーム済み。DocID = 会員コード（例: "C00123"）
-- ホテルはaccounts/{id}/hotelProfile/main サブコレクションで管理される
COMMENT ON COLUMN hotels.customer_code IS 'DOS accounts コレクションのDocID（会員コード。例: "C00123"）。v12でcustomers→accountsにリネーム済み。将来のDOS統合でaccounts/{id}と紐づける。';
CREATE UNIQUE INDEX ON hotels(customer_code) WHERE customer_code IS NOT NULL;

-- ============================================================
-- booking_events: DOS shifts/{id}/events (ShiftEvent) 相当
-- 追記専用（immutable）。UPDATE/DELETE はRLSで禁止。
-- ============================================================
CREATE TABLE booking_events (
  event_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 関連エンティティ（いずれか必須）
  booking_id        uuid REFERENCES bookings(id),
  slot_id           uuid REFERENCES shuttle_slots(id),
  -- DOS ShiftEvent と対応するフィールド
  event_type        text NOT NULL,
  event_at          timestamptz NOT NULL DEFAULT now(),  -- イベント発生時刻
  server_at         timestamptz NOT NULL DEFAULT now(),  -- サーバー受信時刻
  actor_type        text NOT NULL,                       -- driver | hotel_staff | tmk_admin | system
  actor_id          uuid,                                -- auth.users.id
  payload           jsonb,                               -- イベント種別ごとの追加データ
  idempotency_key   text UNIQUE,                         -- 重複防止（オフライン同期用）
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_actor_type CHECK (actor_type IN ('driver','hotel_staff','tmk_admin','system')),
  CONSTRAINT requires_entity CHECK (booking_id IS NOT NULL OR slot_id IS NOT NULL)
);
COMMENT ON TABLE booking_events IS 'DOS shifts/{id}/events (ShiftEvent) 相当の不変イベントログ。UPDATE/DELETE禁止。';

CREATE INDEX ON booking_events(booking_id, event_at DESC);
CREATE INDEX ON booking_events(slot_id, event_at DESC);
CREATE INDEX ON booking_events(event_type, event_at DESC);

-- RLS: INSERT のみ許可。UPDATE/DELETE は一切不可。
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_events_insert ON booking_events
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() IN ('hotel_staff', 'tmk_admin', 'driver')
  );

CREATE POLICY booking_events_read ON booking_events
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'tmk_admin'
    OR (
      current_user_role() = 'hotel_staff'
      AND booking_id IN (
        SELECT id FROM bookings WHERE hotel_id = current_hotel_id()
      )
    )
    OR (
      current_user_role() = 'driver'
      AND slot_id IN (
        SELECT slot_id FROM driver_assignments WHERE driver_id = auth.uid()
      )
    )
  );
-- UPDATE/DELETE ポリシーは意図的に定義しない → 全件拒否（immutable保証）
