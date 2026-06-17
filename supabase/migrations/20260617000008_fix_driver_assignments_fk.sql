-- driver_assignments.driver_id のFK先を auth.users → driver_users に修正
-- RLSポリシーは driver_users.id を参照しているので FK もそれに合わせる
ALTER TABLE driver_assignments
  DROP CONSTRAINT IF EXISTS driver_assignments_driver_id_fkey;

ALTER TABLE driver_assignments
  ADD CONSTRAINT driver_assignments_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES driver_users(id) ON DELETE SET NULL;
