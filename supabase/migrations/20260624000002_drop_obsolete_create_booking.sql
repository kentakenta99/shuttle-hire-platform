-- 古い create_booking（7引数・bookings テーブル参照）を削除
-- 20260623000001 で bookings→service_orders にリネーム済みのため不要
-- PostgREST が古い関数をオーバーロード解決で優先選択し「relation "bookings" does not exist」
-- エラーを引き起こしていた問題を修正
DROP FUNCTION IF EXISTS create_booking(
  uuid,    -- p_slot_id
  text,    -- p_guest_name
  integer, -- p_party_size
  text,    -- p_flight_number
  integer, -- p_luggage_count
  text,    -- p_notes
  text     -- p_booked_by_name
);
