-- booknetics_sync_logs RLS有効化
-- Phase 4 内部ログテーブル。tmk_adminのみ参照可。書き込みはservice_role経由。
ALTER TABLE booknetics_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY booknetics_admin_read ON booknetics_sync_logs
  FOR SELECT TO authenticated
  USING (current_user_role() = 'tmk_admin');
