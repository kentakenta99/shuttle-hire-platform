-- RLSポリシー修正
-- 1. driver_users / tmk_admin_users に SELECT ポリシーが未設定だったため追加
-- 2. driver_assignments / bookings / booking_events の driver_id = auth.uid() が誤り
--    (driver_id は driver_users.id = PKで auth.uid() ではない) → JOIN で修正

-- driver_users: 自分のレコードのみSELECT
CREATE POLICY "driver_read_own_record" ON public.driver_users
  FOR SELECT USING (user_id = auth.uid());

-- tmk_admin_users: 自分のレコードのみSELECT
CREATE POLICY "admin_read_own_record" ON public.tmk_admin_users
  FOR SELECT USING (user_id = auth.uid());

-- driver_assignments: driver_id → driver_users.id → user_id で比較
DROP POLICY IF EXISTS "driver_read_own_assignments" ON public.driver_assignments;
CREATE POLICY "driver_read_own_assignments" ON public.driver_assignments
  FOR SELECT USING (
    (driver_id IN (SELECT id FROM driver_users WHERE user_id = auth.uid()))
    OR (current_user_role() = 'tmk_admin')
  );

-- bookings: ドライバー用ポリシー修正
DROP POLICY IF EXISTS "driver_read_assigned_bookings" ON public.bookings;
CREATE POLICY "driver_read_assigned_bookings" ON public.bookings
  FOR SELECT USING (
    (current_user_role() = 'driver') AND (
      slot_id IN (
        SELECT da.slot_id FROM driver_assignments da
        JOIN driver_users du ON du.id = da.driver_id
        WHERE du.user_id = auth.uid()
      )
    )
  );

-- booking_events: ドライバー用ポリシー修正
DROP POLICY IF EXISTS "booking_events_read" ON public.booking_events;
CREATE POLICY "booking_events_read" ON public.booking_events
  FOR SELECT USING (
    (current_user_role() = 'tmk_admin')
    OR (
      (current_user_role() = 'hotel_staff') AND (
        booking_id IN (SELECT id FROM bookings WHERE hotel_id = current_hotel_id())
      )
    )
    OR (
      (current_user_role() = 'driver') AND (
        slot_id IN (
          SELECT da.slot_id FROM driver_assignments da
          JOIN driver_users du ON du.id = da.driver_id
          WHERE du.user_id = auth.uid()
        )
      )
    )
  );
