-- 出発・到着タイムスタンプを shuttle_slots に追加
-- 将来的に電脳交通API等との連動でここを更新することで UI 側が自動反映される

ALTER TABLE shuttle_slots
  ADD COLUMN IF NOT EXISTS departed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_at   TIMESTAMPTZ;

COMMENT ON COLUMN shuttle_slots.departed_at IS '乗務員が出発ボタンを押した時刻（NULLは未出発）';
COMMENT ON COLUMN shuttle_slots.arrived_at  IS '乗務員が到着ボタンを押した時刻（NULLは未到着）';
