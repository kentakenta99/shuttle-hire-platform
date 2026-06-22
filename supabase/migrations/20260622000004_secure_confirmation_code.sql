-- 確認コードを暗号乱数に変更
-- 旧: TMK-202606-0001（連番9999通り → 総当たり可能）
-- 新: TMK-XXXXXXXXXX（32種×10桁 = 32^10 ≈ 1兆通り）
-- 紛らわしい文字を除外: O/0, I/1

CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS text AS $$
DECLARE
  chars       text   := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code        text   := '';
  rand_bytes  bytea;
  byte_val    int;
  i           int;
BEGIN
  rand_bytes := gen_random_bytes(10);
  FOR i IN 0..9 LOOP
    byte_val := get_byte(rand_bytes, i);
    code := code || substr(chars, (byte_val % 32) + 1, 1);
  END LOOP;
  RETURN 'TMK-' || code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
