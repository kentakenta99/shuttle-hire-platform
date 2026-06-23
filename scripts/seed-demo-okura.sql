-- ============================================================
-- ホテルオークラ東京 × 東京MK デモシードスクリプト
-- 使い方: reset-demo.sql を先に実行してから流す
-- 注意:   本番DBには流さない。auth_user_id は事前に作成したデモアカウントに変更すること
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- 1. ホテルオークラ東京 デモホテルマスタ
--    auth_user_id: ホテルオークラ用デモアカウントのUIDに差し替える
-- --------------------------------------------------------
INSERT INTO hotels (
  id,
  name,
  name_en,
  slug,
  pickup_address,
  pickup_lat,
  pickup_lng,
  contact_name,
  contact_email,
  contact_phone,
  billing_email,
  auth_user_id,
  is_active
) VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
  'ホテルオークラ東京',
  'Hotel Okura Tokyo',
  'okura',
  '東京都港区虎ノ門2-10-4',
  35.6695,
  139.7419,
  '田中 フロントマネージャー',
  'demo-okura@tokyomk.com',
  '03-3582-0111',
  'billing-okura@tokyomk.com',
  NULL,  -- ← デモ前に実際のSupabase auth UIDに変更すること
  true
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      pickup_address = EXCLUDED.pickup_address,
      is_active = true;

-- --------------------------------------------------------
-- 2. 今日〜翌7日分のシャトル枠
--    9:00 / 11:30 / 14:00 の3便/日
-- --------------------------------------------------------
DO $$
DECLARE
  okura_id uuid := 'bbbbbbbb-0000-0000-0000-000000000002'::uuid;
  base_date date := CURRENT_DATE;
  i int;
  t text;
  slot_id uuid;
  departure_times text[] := ARRAY['09:00', '11:30', '14:00'];
BEGIN
  FOR i IN 0..6 LOOP
    FOREACH t IN ARRAY departure_times LOOP
      slot_id := gen_random_uuid();
      INSERT INTO shuttle_slots (
        id,
        date,
        departure_time,
        capacity,
        remaining_seats,
        vehicle_type,
        vehicle_plate,
        price_per_seat_yen,
        cutoff_at,
        status
      ) VALUES (
        slot_id,
        base_date + i,
        t::time,
        6,
        CASE
          WHEN i = 0 AND t = '09:00' THEN 0  -- 本日9時: 満席（デモ用）
          WHEN i = 0 AND t = '11:30' THEN 2  -- 本日11:30: 残2席
          WHEN i = 0 AND t = '14:00' THEN 5  -- 本日14時: 余裕あり
          WHEN i = 1 AND t = '09:00' THEN 3
          ELSE 6
        END,
        'premium',
        CASE
          WHEN t = '09:00'  THEN '品川 500 あ 8888'
          WHEN t = '11:30'  THEN '品川 500 い 7777'
          ELSE              '品川 500 う 6666'
        END,
        15000,
        (base_date + i - 1)::timestamptz + interval '17 hours',
        CASE
          WHEN i = 0 AND t = '09:00' THEN 'full'::text
          ELSE 'open'::text
        END
      );

      -- 本日9時便（満席）に予約6件
      IF i = 0 AND t = '09:00' THEN
        INSERT INTO service_orders (
          booking_reference, slot_id, hotel_id,
          guest_name, party_size, flight_number, luggage_count,
          booked_by_name, status, guest_email, created_at
        ) VALUES
          ('OKU-DEMO000001', slot_id, okura_id,
           'SMITH JOHN', 2, 'NH829', 2, 'オークラ フロント', 'confirmed',
           'john.smith@example.com', now() - interval '3 days'),
          ('OKU-DEMO000002', slot_id, okura_id,
           'WILLIAMS SARAH', 1, 'JL061', 1, 'オークラ フロント', 'confirmed',
           'sarah.williams@example.com', now() - interval '2 days'),
          ('OKU-DEMO000003', slot_id, okura_id,
           'CHEN WEI', 2, 'CA839', 3, 'オークラ フロント', 'confirmed',
           NULL, now() - interval '2 days'),
          ('OKU-DEMO000004', slot_id, okura_id,
           'MÜLLER HANS', 1, 'LH716', 1, 'オークラ フロント', 'completed',
           'hans.muller@example.com', now() - interval '1 day')
        ON CONFLICT (booking_reference) DO NOTHING;
      END IF;

      -- 本日11:30便（残2席）に予約4件
      IF i = 0 AND t = '11:30' THEN
        INSERT INTO service_orders (
          booking_reference, slot_id, hotel_id,
          guest_name, party_size, flight_number, luggage_count,
          booked_by_name, status, guest_email, created_at
        ) VALUES
          ('OKU-DEMO000005', slot_id, okura_id,
           'TANAKA KENJI', 2, 'NH005', 2, 'オークラ フロント', 'confirmed',
           'kenji.tanaka@example.com', now() - interval '1 day'),
          ('OKU-DEMO000006', slot_id, okura_id,
           'BROWN MICHAEL', 2, 'BA009', 2, 'オークラ フロント', 'confirmed',
           'michael.brown@example.com', now() - interval '12 hours')
        ON CONFLICT (booking_reference) DO NOTHING;
      END IF;

    END LOOP;
  END LOOP;
END $$;

COMMIT;

-- --------------------------------------------------------
-- 確認クエリ
-- --------------------------------------------------------
SELECT
  h.name AS hotel,
  s.date,
  s.departure_time,
  s.status,
  s.remaining_seats || '/' || s.capacity AS seats,
  COUNT(o.id) AS bookings
FROM shuttle_slots s
JOIN service_orders o ON o.slot_id = s.id
JOIN hotels h ON h.id = o.hotel_id
WHERE h.id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid
  AND s.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 6
GROUP BY h.name, s.id, s.date, s.departure_time, s.status, s.remaining_seats, s.capacity
ORDER BY s.date, s.departure_time;
