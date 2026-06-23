-- pg_cron: OTP自動削除ジョブ
-- 毎日 18:00 UTC（= 翌3:00 JST）に期限切れOTPを削除
-- 実行前に Supabase ダッシュボードで pg_cron extension が有効であることを確認すること

SELECT cron.schedule(
  'cleanup-expired-otps',
  '0 18 * * *',
  $$
    DELETE FROM cancel_otps
    WHERE created_at < NOW() - INTERVAL '24 hours';
  $$
);
