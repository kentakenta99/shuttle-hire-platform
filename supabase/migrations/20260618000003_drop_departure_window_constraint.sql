-- 出発時刻を 11:00〜15:00 に制限していた制約を削除
-- 実際の運行時間帯に合わせて任意の時刻で便を登録できるようにする
ALTER TABLE shuttle_slots DROP CONSTRAINT IF EXISTS valid_departure_window;
