-- キャンセルポリシー設定テーブル
-- 1行のみ運用（スーパーアドミンが上書き更新）
CREATE TABLE cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_hours NUMERIC(4,1) NOT NULL DEFAULT 2.0,  -- この時間以内はfeePct徴収
  fee_pct        INT          NOT NULL DEFAULT 25,     -- キャンセル料率(%)
  note           text,                                 -- 管理者メモ
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  updated_by_name text                                 -- 最終更新者名
);

-- RLS: 読み取りはサービスロールのみ（ゲスト直接SELECT不可）
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

-- 初期データ
INSERT INTO cancellation_policies (threshold_hours, fee_pct, note, updated_by_name)
VALUES (2.0, 25, '初期設定', 'system');
