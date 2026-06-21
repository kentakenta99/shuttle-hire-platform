-- ドライバーアサイン/解除のイベントログテーブル
CREATE TABLE driver_assignment_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         uuid NOT NULL REFERENCES shuttle_slots(id) ON DELETE CASCADE,
  driver_id       uuid REFERENCES driver_users(id) ON DELETE SET NULL,
  employee_code   text NOT NULL,
  driver_name     text,
  action          text NOT NULL CHECK (action IN ('assigned', 'unassigned')),
  performed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX driver_assignment_logs_slot_idx ON driver_assignment_logs(slot_id, created_at DESC);

ALTER TABLE driver_assignment_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ参照・挿入可（サービスロール経由で INSERT する）
CREATE POLICY "admin_select" ON driver_assignment_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tmk_admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
