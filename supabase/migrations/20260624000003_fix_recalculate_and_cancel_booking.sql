-- recalculate_slot_pricing: bookings → service_orders に修正
-- fix_rpc_dos_rename_alignment (20260623000002) が更新し忘れていたため
-- create_booking 内から呼ばれると「relation bookings does not exist」が発生していた
CREATE OR REPLACE FUNCTION recalculate_slot_pricing(
  p_slot_id  uuid,
  p_hotel_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total INT; v_price INT;
BEGIN
  SELECT COALESCE(SUM(party_size), 0) INTO v_total
  FROM service_orders
  WHERE slot_id = p_slot_id AND hotel_id = p_hotel_id AND status != 'cancelled';

  IF v_total = 0 THEN RETURN; END IF;

  SELECT per_person_price INTO v_price
  FROM hotel_pricing_tiers
  WHERE hotel_id = p_hotel_id AND party_size <= v_total
  ORDER BY party_size DESC LIMIT 1;

  IF v_price IS NULL THEN RETURN; END IF;

  UPDATE service_orders
  SET unit_price  = v_price,
      total_price = v_price * party_size
  WHERE slot_id = p_slot_id
    AND hotel_id = p_hotel_id
    AND status != 'cancelled'
    AND (unit_price IS NULL OR unit_price > v_price);
END;
$$;

-- cancel_booking_by_hotel の旧版（2引数・auth.uid()でホテル特定・bookings参照）を削除
-- 新版（3引数・p_hotel_id受け取り・service_orders参照）は 20260623000002 で作成済み
DROP FUNCTION IF EXISTS cancel_booking_by_hotel(uuid, text);
