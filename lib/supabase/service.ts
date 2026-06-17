import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// サーバーサイド専用（service_role key はクライアントに漏洩しないこと）
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
