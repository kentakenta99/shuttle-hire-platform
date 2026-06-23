-- DOS alignment fix: RPCのテーブル名・カラム名・関数名を新命名規則に統一
-- bookings → service_orders
-- confirmation_code → booking_reference
-- generate_confirmation_code() → generate_booking_reference()
-- 原因: 20260623000001_dos_alignment_rename.sql でテーブルをリネームしたが
--       create_booking / cancel_booking_by_hotel 関数の本体が未更新だった

CREATE OR REPLACE FUNCTION create_booking(
  p_slot_id        uuid,
  p_hotel_id       uuid,
  p_guest_name     text,
  p_party_size     int,
  p_flight_number  text,
  p_luggage_count  int,
  p_notes          text DEFAULT NULL,
  p_booked_by_name text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ref text; v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM hotels WHERE id=p_hotel_id AND is_active=true) THEN
    RETURN json_build_object('error','UNAUTHORIZED');
  END IF;

  UPDATE shuttle_slots
  SET remaining_seats=remaining_seats-p_party_size,
      status=CASE WHEN remaining_seats-p_party_size=0 THEN 'full' ELSE status END,
      updated_at=now()
  WHERE id=p_slot_id AND status='open' AND remaining_seats>=p_party_size AND cutoff_at>now();

  IF NOT FOUND THEN RETURN json_build_object('error','SLOT_UNAVAILABLE'); END IF;

  v_ref := generate_booking_reference();

  INSERT INTO service_orders(
    booking_reference, slot_id, hotel_id,
    guest_name, party_size, flight_number,
    luggage_count, notes, booked_by_name, created_by
  ) VALUES(
    v_ref, p_slot_id, p_hotel_id,
    p_guest_name, p_party_size, p_flight_number,
    p_luggage_count, p_notes, p_booked_by_name, auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM recalculate_slot_pricing(p_slot_id, p_hotel_id);
  UPDATE service_orders SET original_unit_price=unit_price WHERE id=v_id AND original_unit_price IS NULL AND unit_price IS NOT NULL;

  RETURN json_build_object('booking_id', v_id, 'confirmation_code', v_ref);
END;$$;

CREATE OR REPLACE FUNCTION cancel_booking_by_hotel(
  p_booking_id uuid,
  p_hotel_id   uuid DEFAULT NULL,
  p_reason     text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_slot uuid; v_size int; v_hotel uuid;
BEGIN
  IF p_hotel_id IS NOT NULL THEN
    v_hotel := p_hotel_id;
    IF NOT EXISTS(SELECT 1 FROM hotels WHERE id=v_hotel AND is_active=true) THEN
      RETURN json_build_object('error','UNAUTHORIZED');
    END IF;
  ELSE
    SELECT id INTO v_hotel FROM hotels WHERE auth_user_id=auth.uid() AND is_active=true;
    IF v_hotel IS NULL THEN RETURN json_build_object('error','UNAUTHORIZED'); END IF;
  END IF;

  SELECT slot_id, party_size INTO v_slot, v_size
  FROM service_orders
  WHERE id=p_booking_id AND hotel_id=v_hotel AND status='confirmed';

  IF NOT FOUND THEN RETURN json_build_object('error','BOOKING_NOT_FOUND'); END IF;

  IF NOT EXISTS(SELECT 1 FROM shuttle_slots WHERE id=v_slot AND cutoff_at>now()) THEN
    RETURN json_build_object('error','PAST_CUTOFF');
  END IF;

  UPDATE service_orders
  SET status='cancelled', cancelled_reason=p_reason, cancelled_at=now()
  WHERE id=p_booking_id;

  UPDATE shuttle_slots
  SET remaining_seats=remaining_seats+v_size,
      status=CASE WHEN status='full' THEN 'open' ELSE status END,
      updated_at=now()
  WHERE id=v_slot;

  PERFORM recalculate_slot_pricing(v_slot, v_hotel);
  RETURN json_build_object('success', true);
END;$$;
