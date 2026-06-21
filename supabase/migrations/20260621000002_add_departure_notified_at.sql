-- shuttle_slots: 出発前通知済みタイムスタンプ
-- Cron ジョブが重複送信を防ぐために使用する
ALTER TABLE shuttle_slots ADD COLUMN IF NOT EXISTS departure_notified_at timestamptz;
