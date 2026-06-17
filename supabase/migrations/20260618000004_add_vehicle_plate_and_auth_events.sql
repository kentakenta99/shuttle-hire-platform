-- 車両ナンバープレートフィールド
ALTER TABLE shuttle_slots ADD COLUMN IF NOT EXISTS vehicle_plate text;

-- 認証イベントログテーブル（不正ログイン監視用）
CREATE TABLE IF NOT EXISTS auth_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  text NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'login_unauthorized')),
  role        text NOT NULL CHECK (role IN ('hotel_staff', 'tmk_admin', 'driver')),
  email       text NOT NULL,
  user_id     uuid,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_events_created_at_idx  ON auth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_event_type_idx  ON auth_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_ip_idx          ON auth_events (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_email_idx       ON auth_events (email, created_at DESC);

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tmk_admin_read_auth_events" ON auth_events
  FOR SELECT USING (current_user_role() = 'tmk_admin');
