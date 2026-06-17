-- ① bookings: guest_emailカラム追加
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email text;

-- ② driver_users: tmk_adminが全乗務員レコードを参照できるようにする
--    （admin画面のJOINでdriver_usersを読めずに「未アサイン」表示になっていたバグを修正）
CREATE POLICY "admin_read_driver_users"
  ON driver_users
  FOR SELECT
  TO authenticated
  USING (current_user_role() = 'tmk_admin');

-- ③ 車種区分を4種に変更（既存レコードは「未定」に移行）
UPDATE shuttle_slots
  SET vehicle_type = '未定'
  WHERE vehicle_type IN ('スタンダードハイヤー', 'プレミアムハイヤー');
