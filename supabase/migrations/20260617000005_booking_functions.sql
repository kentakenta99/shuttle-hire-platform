-- ============================================================
-- 予約操作 RPC関数（楽観的ロック・SECURITY DEFINER）
-- ============================================================

-- 原子的予約作成：残席デクリメント + booking INSERT を1トランザクションで実行
CREATE OR REPLACE FUNCTION create_booking(
  p_slot_id        uuid,
  p_guest_name     text,
  p_party_size     int,
  p_flight_number  text,
  p_luggage_count  int,
  p_notes          text    DEFAULT NULL,
  p_booked_by_name text    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hotel_id  uuid;
  v_conf_code text;
  v_booking_id uuid;
BEGIN
  -- 呼び出しユーザーの所属ホテルを取得（認証チェック兼用）
  SELECT id INTO v_hotel_id
  FROM hotels
  WHERE auth_user_id = auth.uid() AND is_active = true;

  IF v_hotel_id IS NULL THEN
    RETURN json_build_object('error', 'UNAUTHORIZED');
  END IF;

  -- 楽観的ロック：残席 >= 人数 かつ open かつ締切前
  UPDATE shuttle_slots
  SET
    remaining_seats = remaining_seats - p_party_size,
    status = CASE
               WHEN remaining_seats - p_party_size = 0 THEN 'full'
               ELSE status
             END,
    updated_at = now()
  WHERE id = p_slot_id
    AND status = 'open'
    AND remaining_seats >= p_party_size
    AND cutoff_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'SLOT_UNAVAILABLE');
  END IF;

  -- 確認番号生成（月次シーケンス）
  v_conf_code := generate_confirmation_code();

  -- 予約INSERT
  INSERT INTO bookings (
    confirmation_code, slot_id, hotel_id,
    guest_name, party_size, flight_number,
    luggage_count, notes, booked_by_name, created_by
  ) VALUES (
    v_conf_code, p_slot_id, v_hotel_id,
    p_guest_name, p_party_size, p_flight_number,
    p_luggage_count, p_notes, p_booked_by_name, auth.uid()
  )
  RETURNING id INTO v_booking_id;

  RETURN json_build_object('booking_id', v_booking_id, 'confirmation_code', v_conf_code);
END;
$$;

-- ホテルスタッフによるキャンセル（締切前のみ）
CREATE OR REPLACE FUNCTION cancel_booking_by_hotel(
  p_booking_id uuid,
  p_reason     text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot_id    uuid;
  v_party_size int;
  v_hotel_id   uuid;
BEGIN
  -- 呼び出しユーザーの所属ホテルを取得
  SELECT id INTO v_hotel_id
  FROM hotels
  WHERE auth_user_id = auth.uid() AND is_active = true;

  IF v_hotel_id IS NULL THEN
    RETURN json_build_object('error', 'UNAUTHORIZED');
  END IF;

  -- 予約取得（自ホテル・confirmed のみ）
  SELECT slot_id, party_size INTO v_slot_id, v_party_size
  FROM bookings
  WHERE id = p_booking_id
    AND hotel_id = v_hotel_id
    AND status = 'confirmed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 締切前かチェック
  IF NOT EXISTS (
    SELECT 1 FROM shuttle_slots
    WHERE id = v_slot_id AND cutoff_at > now()
  ) THEN
    RETURN json_build_object('error', 'PAST_CUTOFF');
  END IF;

  -- 予約をキャンセルへ
  UPDATE bookings
  SET status = 'cancelled',
      cancelled_reason = p_reason,
      cancelled_at = now()
  WHERE id = p_booking_id;

  -- 残席を戻す
  UPDATE shuttle_slots
  SET remaining_seats = remaining_seats + v_party_size,
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END,
      updated_at = now()
  WHERE id = v_slot_id;

  RETURN json_build_object('success', true);
END;
$$;
