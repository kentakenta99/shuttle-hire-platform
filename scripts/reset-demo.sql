-- ============================================================
-- デモリセットスクリプト
-- 使い方: Supabase MCP の execute_sql で実行
-- 目的:   デモ前・2回目デモ前に前回データをクリアして seed-demo.sql を再適用できる状態にする
-- 注意:   本番DBには絶対流さない
-- ============================================================

BEGIN;

-- 1. デモ予約データを削除（demo hotel の注文のみ）
DELETE FROM service_orders
WHERE hotel_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;

-- 2. ホテルオークラ向けデモ予約を削除（あれば）
DELETE FROM service_orders
WHERE hotel_id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid;

-- 3. デモ期間のスロットを削除
DELETE FROM shuttle_slots
WHERE date BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 14;

-- 4. キャンセルOTPのテストデータを削除
DELETE FROM cancel_otps
WHERE booking_reference LIKE 'TMK-DEMO%';

-- 5. departure_notified_at をリセット（通知テスト再実行用）
UPDATE shuttle_slots
SET departure_notified_at = NULL
WHERE date >= CURRENT_DATE;

-- 6. デモホテルのアカウント情報は保持（削除しない）
-- hotels テーブルのデモレコードはそのままにする

COMMIT;

-- 確認
SELECT 'reset complete' AS status,
       (SELECT COUNT(*) FROM service_orders WHERE hotel_id IN (
         'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
         'bbbbbbbb-0000-0000-0000-000000000002'::uuid
       )) AS remaining_orders,
       (SELECT COUNT(*) FROM shuttle_slots WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14) AS remaining_slots;
