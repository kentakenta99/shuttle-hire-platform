-- OTPセキュリティ強化
-- 1. 試行回数カラム追加（5回失敗でOTP無効化）
-- 2. pg_cronによる期限切れレコードの自動クリーンアップ

ALTER TABLE cancel_otps ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0;

-- pg_cron拡張（Supabaseでは通常有効済み）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 毎日 03:00 JST（18:00 UTC）に24時間以上前に期限切れになったOTPを削除
SELECT cron.schedule(
  'cleanup-cancel-otps',
  '0 18 * * *',
  $$DELETE FROM cancel_otps WHERE expires_at < now() - interval '24 hours'$$
);
