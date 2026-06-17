-- ============================================================
-- RLS ポリシー
-- ============================================================

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shuttle_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmk_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_invoices ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数: 現在のユーザーのロール
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM hotels WHERE auth_user_id = auth.uid()) THEN 'hotel_staff'
    WHEN EXISTS (SELECT 1 FROM tmk_admin_users WHERE user_id = auth.uid()) THEN 'tmk_admin'
    WHEN EXISTS (SELECT 1 FROM driver_users WHERE user_id = auth.uid()) THEN 'driver'
    ELSE NULL
  END
$$ LANGUAGE sql SECURITY DEFINER;

-- ヘルパー関数: hotel_staff の所属ホテルID
CREATE OR REPLACE FUNCTION current_hotel_id()
RETURNS uuid AS $$
  SELECT id FROM hotels WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- shuttle_slots: 全認証ユーザーがSELECT可 / 管理はtmk_adminのみ
CREATE POLICY read_shuttle_slots ON shuttle_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_manage_shuttle_slots ON shuttle_slots
  FOR ALL TO authenticated
  USING (current_user_role() = 'tmk_admin')
  WITH CHECK (current_user_role() = 'tmk_admin');

-- bookings: hotel_staffは自ホテルのみ / tmk_adminは全件 / driverは参照のみ
CREATE POLICY hotel_staff_own_bookings ON bookings
  FOR ALL TO authenticated
  USING (
    (current_user_role() = 'hotel_staff' AND hotel_id = current_hotel_id())
    OR current_user_role() = 'tmk_admin'
  );

CREATE POLICY driver_read_assigned_bookings ON bookings
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'driver'
    AND slot_id IN (
      SELECT slot_id FROM driver_assignments WHERE driver_id = auth.uid()
    )
  );

-- hotels: hotel_staffは自ホテルのみ参照
CREATE POLICY hotel_staff_read_own_hotel ON hotels
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR current_user_role() = 'tmk_admin'
  );

-- driver_assignments: driverは自分のアサインのみ / adminは全件
CREATE POLICY driver_read_own_assignments ON driver_assignments
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    OR current_user_role() = 'tmk_admin'
  );

CREATE POLICY admin_manage_driver_assignments ON driver_assignments
  FOR ALL TO authenticated
  USING (current_user_role() = 'tmk_admin')
  WITH CHECK (current_user_role() = 'tmk_admin');

-- monthly_invoices: hotel_staffは自ホテルのみ / tmk_adminは全件
CREATE POLICY hotel_staff_own_invoices ON monthly_invoices
  FOR SELECT TO authenticated
  USING (
    hotel_id = current_hotel_id()
    OR current_user_role() = 'tmk_admin'
  );
