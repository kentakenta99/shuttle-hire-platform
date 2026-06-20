-- ゲストLPのスパムボット対策：IP記録 + レートリミット用インデックス
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 同IPの直近リクエスト件数を素早く数えるためのインデックス
CREATE INDEX IF NOT EXISTS idx_booking_requests_ip_created
  ON booking_requests (ip_address, created_at DESC);
