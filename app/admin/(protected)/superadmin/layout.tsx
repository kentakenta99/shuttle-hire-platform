import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('tmk_admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!(data as unknown as { is_super_admin: boolean } | null)?.is_super_admin) {
    redirect('/admin')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">👑</span>
        <h1 className="text-lg font-bold text-gray-900">スーパー管理者</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { href: '/admin/superadmin', label: 'ダッシュボード' },
          { href: '/admin/superadmin/users', label: 'ユーザー管理' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t transition"
          >
            {label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
