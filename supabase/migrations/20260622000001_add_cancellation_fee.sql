-- キャンセル料記録カラム追加
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_fee INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN bookings.cancellation_fee IS '徴収キャンセル料（円）。出発2時間以上前=0、2時間以内=total_priceの25%';
