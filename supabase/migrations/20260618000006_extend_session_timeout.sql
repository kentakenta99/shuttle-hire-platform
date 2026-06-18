-- session_timeout_min のデフォルトを 60 → 480分（8時間）に変更
-- ホテルスタッフ・乗務員が数分の無操作でログアウトされる問題を解消
ALTER TABLE hotels ALTER COLUMN session_timeout_min SET DEFAULT 480;

-- 既存ホテルのタイムアウトも一括更新（60分のままのもの）
UPDATE hotels SET session_timeout_min = 480 WHERE session_timeout_min <= 60;
