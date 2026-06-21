-- 出発15分前スロットを返すRPC関数
-- Vercel Cronから呼ばれる: 日本時間で出発14〜16分前のスロットをピックアップ
CREATE OR REPLACE FUNCTION get_slots_for_departure_notification()
RETURNS TABLE (
  id uuid,
  date date,
  departure_time time,
  vehicle_type text,
  vehicle_plate text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ss.id,
    ss.date,
    ss.departure_time,
    ss.vehicle_type,
    ss.vehicle_plate
  FROM shuttle_slots ss
  WHERE ss.status IN ('open', 'full')
    AND ss.departure_notified_at IS NULL
    -- date + departure_time は JST naive datetime として格納されているため
    -- AT TIME ZONE 'Asia/Tokyo' で UTC timestamptz に変換して比較
    AND (ss.date + ss.departure_time)::timestamp AT TIME ZONE 'Asia/Tokyo'
        BETWEEN NOW() + INTERVAL '14 minutes'
            AND NOW() + INTERVAL '16 minutes'
  LIMIT 20;
$$;

-- service_roleからのみ呼び出し可能
REVOKE EXECUTE ON FUNCTION get_slots_for_departure_notification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_slots_for_departure_notification TO service_role;
