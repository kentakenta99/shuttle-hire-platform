-- ゲストキャンセルOTP（メール認証）テーブル
-- キャンセル前に登録済みメールアドレスへ6桁コードを送信・照合することで
-- 確認コード総当たりによる第三者キャンセルを防止する

CREATE TABLE IF NOT EXISTS cancel_otps (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text        NOT NULL,
  otp_code         text         NOT NULL,   -- 6桁数字（平文）
  expires_at       timestamptz  NOT NULL DEFAULT now() + interval '10 minutes',
  used_at          timestamptz,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancel_otps_lookup
  ON cancel_otps (confirmation_code, expires_at DESC);

-- フロントエンドからの直接アクセスを禁止（サービスロールのみ）
ALTER TABLE cancel_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON cancel_otps FOR ALL USING (false);
