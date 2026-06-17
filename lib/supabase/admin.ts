import { createClient } from '@supabase/supabase-js'

// サービスロールクライアント（RLSをバイパス）
// サーバーサイドの管理者操作専用。絶対にクライアントに渡さないこと。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
