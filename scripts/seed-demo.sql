-- ============================================================
-- シャトルハイヤープラットフォーム デモシードスクリプト
-- 使い方: Supabase MCP の execute_sql で実行、または psql で流す
-- 対象:   ステークホルダーデモ・開発検証用
-- 注意:   本番DBには流さない。DEMOホテルのデータのみ作成する
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- 1. デモホテル作成
--    auth_user_id は NULL（ログイン不要のデモ閲覧向け）
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
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'ホテルデモ東京',
  'Hotel Demo Tokyo',
  'demo-hotel',
  '東京都港区虎ノ門1-1-1',
  35.6677,
  139.7495,
  'デモ 太郎',
  'demo@example.com',
  '03-0000-0000',
  'billing@example.com',
  NULL,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------------------------------------
-- 2. 今日から7日分の出発枠を作成
--    1日2枠（9:00 と 12:00）× 7日 = 14枠
-- --------------------------------------------------------
DO $$
DECLARE
  base_date date := CURRENT_DATE;
  i int;
  departure_times text[] := ARRAY['09:00', '12:00'];
  t text;
  slot_id uuid;
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
        status,
        notes
      ) VALUES (
        slot_id,
        base_date + i,
        t::time,
        6,
        CASE WHEN i = 0 AND t = '09:00' THEN 2  -- 今日の朝便: 残席2（ほぼ満席）
             WHEN i = 0 AND t = '12:00' THEN 5  -- 今日の昼便: 残席5
             WHEN i = 1               THEN 4
             WHEN i = 2               THEN 6    -- 2日後: まだ空
             ELSE 5 END,
        'standard',
        CASE WHEN t = '09:00' THEN '品川 500 あ 1234'
             ELSE              '品川 500 い 5678' END,
        13500,
        (base_date + i - 1)::timestamptz + interval '17 hours',  -- 前日17時締切
        CASE WHEN i = 0 AND t = '09:00' THEN 'full'::text
             ELSE 'open'::text END,
        CASE WHEN i = 0 THEN 'デモ用サンプル便（本日）'
             ELSE NULL END
      )
      ON CONFLICT DO NOTHING;

      -- 今日の9時便（full）に予約を3件埋め込む
      IF i = 0 AND t = '09:00' THEN
        INSERT INTO service_orders (
          booking_reference, slot_id, hotel_id,
          guest_name, party_size, flight_number, luggage_count,
          booked_by_name, status, created_at
        ) VALUES
          ('TMK-DEMO000001', slot_id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
           'YAMADA TARO', 2, 'NH001', 2, 'デモスタッフ', 'confirmed', now() - interval '2 days'),
          ('TMK-DEMO000002', slot_id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
           'SUZUKI HANAKO', 2, 'JL002', 3, 'デモスタッフ', 'confirmed', now() - interval '1 day'),
          ('TMK-DEMO000003', slot_id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
           'TANAKA ICHIRO', 2, 'NH003', 1, 'デモスタッフ', 'confirmed', now() - interval '12 hours')
        ON CONFLICT (booking_reference) DO NOTHING;
      END IF;

      -- 明日の12時便に予約1件
      IF i = 1 AND t = '12:00' THEN
        INSERT INTO service_orders (
          booking_reference, slot_id, hotel_id,
          guest_name, party_size, flight_number, luggage_count,
          booked_by_name, status, created_at
        ) VALUES
          ('TMK-DEMO000004', slot_id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
           'JOHNSON EMILY', 2, 'EK319', 2, 'デモスタッフ', 'confirmed', now() - interval '6 hours')
        ON CONFLICT (booking_reference) DO NOTHING;
      END IF;

    END LOOP;
  END LOOP;
END $$;

COMMIT;

-- --------------------------------------------------------
-- 確認クエリ（実行後に結果を見て確認）
-- --------------------------------------------------------
SELECT
  s.date,
  s.departure_time,
  s.status,
  s.remaining_seats || '/' || s.capacity AS seats,
  COUNT(o.id) AS bookings
FROM shuttle_slots s
LEFT JOIN service_orders o ON o.slot_id = s.id
WHERE s.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 6
GROUP BY s.id, s.date, s.departure_time, s.status, s.remaining_seats, s.capacity
ORDER BY s.date, s.departure_time;
