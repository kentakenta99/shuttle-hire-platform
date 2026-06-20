-- 動的スロット料金：後から乗客が増えると全員の単価が下がる。キャンセルで値上がりしない（最安値確約）

-- 1. original_unit_price カラム追加（予約確定時の提示額スナップショット）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS original_unit_price INT;

COMMENT ON COLUMN bookings.original_unit_price IS
  '予約確定時に提示した1人単価（JPY）。unit_price が下がっても変わらない。差分がお得額の表示に使われる。';

-- 2. recalculate_slot_pricing: スロット内の全確定予約を最安値ティアで更新（下げのみ）
CREATE OR REPLACE FUNCTION recalculate_slot_pricing(
  p_slot_id  UUID,
  p_hotel_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_party_size INT;
  v_per_person_price INT;
BEGIN
  SELECT COALESCE(SUM(party_size), 0)
  INTO v_total_party_size
  FROM bookings
  WHERE slot_id  = p_slot_id
    AND hotel_id = p_hotel_id
    AND status  != 'cancelled';

  IF v_total_party_size = 0 THEN RETURN; END IF;

  SELECT per_person_price
  INTO v_per_person_price
  FROM hotel_pricing_tiers
  WHERE hotel_id   = p_hotel_id
    AND party_size <= v_total_party_size
  ORDER BY party_size DESC
  LIMIT 1;

  IF v_per_person_price IS NULL THEN RETURN; END IF;

  -- 価格は下げるのみ（unit_price > 新価格 の場合のみ更新）
  UPDATE bookings
  SET
    unit_price  = v_per_person_price,
    total_price = v_per_person_price * party_size
  WHERE slot_id  = p_slot_id
    AND hotel_id = p_hotel_id
    AND status  != 'cancelled'
    AND (unit_price IS NULL OR unit_price > v_per_person_price);
END;
$$;

-- 3. create_booking: 予約後にスロット全体を再計算し original_unit_price をスナップショット
CREATE OR REPLACE FUNCTION create_booking(
  p_slot_id        uuid,
  p_hotel_id       uuid,
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
  v_conf_code  text;
  v_booking_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hotels WHERE id = p_hotel_id AND is_active = true) THEN
    RETURN json_build_object('error', 'UNAUTHORIZED');
  END IF;

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

  v_conf_code := generate_confirmation_code();

  INSERT INTO bookings (
    confirmation_code, slot_id, hotel_id,
    guest_name, party_size, flight_number,
    luggage_count, notes, booked_by_name, created_by
  ) VALUES (
    v_conf_code, p_slot_id, p_hotel_id,
    p_guest_name, p_party_size, p_flight_number,
    p_luggage_count, p_notes, p_booked_by_name, auth.uid()
  )
  RETURNING id INTO v_booking_id;

  -- スロット全体の合計人数でティアを再計算（全予約の unit_price を下げる可能性あり）
  PERFORM recalculate_slot_pricing(p_slot_id, p_hotel_id);

  -- 新規予約の original_unit_price = 再計算後の unit_price（1度だけ記録）
  UPDATE bookings
  SET original_unit_price = unit_price
  WHERE id = v_booking_id
    AND original_unit_price IS NULL
    AND unit_price IS NOT NULL;

  RETURN json_build_object('booking_id', v_booking_id, 'confirmation_code', v_conf_code);
END;
$$;

-- 4. cancel_booking_by_hotel: キャンセル後に残予約を再計算（価格保護あり）
CREATE OR REPLACE FUNCTION cancel_booking_by_hotel(
  p_booking_id uuid,
  p_hotel_id   uuid    DEFAULT NULL,
  p_reason     text    DEFAULT NULL
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
  IF p_hotel_id IS NOT NULL THEN
    v_hotel_id := p_hotel_id;
    IF NOT EXISTS (SELECT 1 FROM hotels WHERE id = v_hotel_id AND is_active = true) THEN
      RETURN json_build_object('error', 'UNAUTHORIZED');
    END IF;
  ELSE
    SELECT id INTO v_hotel_id FROM hotels WHERE auth_user_id = auth.uid() AND is_active = true;
    IF v_hotel_id IS NULL THEN
      RETURN json_build_object('error', 'UNAUTHORIZED');
    END IF;
  END IF;

  SELECT slot_id, party_size INTO v_slot_id, v_party_size
  FROM bookings
  WHERE id = p_booking_id
    AND hotel_id = v_hotel_id
    AND status = 'confirmed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'BOOKING_NOT_FOUND');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM shuttle_slots WHERE id = v_slot_id AND cutoff_at > now()
  ) THEN
    RETURN json_build_object('error', 'PAST_CUTOFF');
  END IF;

  UPDATE bookings
  SET status = 'cancelled',
      cancelled_reason = p_reason,
      cancelled_at = now()
  WHERE id = p_booking_id;

  UPDATE shuttle_slots
  SET remaining_seats = remaining_seats + v_party_size,
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END,
      updated_at = now()
  WHERE id = v_slot_id;

  -- キャンセル後に残予約を再計算（価格保護: unit_price > 新価格 の場合のみ下げる。上げない）
  PERFORM recalculate_slot_pricing(v_slot_id, v_hotel_id);

  RETURN json_build_object('success', true);
END;
$$;
