-- キャンセルポリシーをホテル別に拡張
-- hotel_id = NULL の行がグローバルデフォルト
-- hotel_id != NULL の行がホテル別設定

ALTER TABLE cancellation_policies
  ADD COLUMN hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE;

-- 既存の単一行（グローバルデフォルト）はそのまま hotel_id = NULL
-- 新しいホテル別設定を追加するときは hotel_id を指定

-- UNIQUE 制約: ホテルあたり最大1行
CREATE UNIQUE INDEX cancellation_policies_per_hotel
  ON cancellation_policies(hotel_id);

-- ホテル別ポリシーの RLS ポリシー
-- スーパーアドミンだけが管理可能
CREATE POLICY cancellation_policies_select_admin ON cancellation_policies
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'tmk_admin'
  );

CREATE POLICY cancellation_policies_update_admin ON cancellation_policies
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'tmk_admin'
  )
  WITH CHECK (
    current_user_role() = 'tmk_admin'
  );

CREATE POLICY cancellation_policies_insert_admin ON cancellation_policies
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() = 'tmk_admin'
  );

-- DELETE は意図的に禁止（RLSで許可ポリシーなし）
