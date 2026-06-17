import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import AdminNavClient from './AdminNavClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: adminRaw } = await supabase
    .from('tmk_admin_users')
    .select('display_name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!adminRaw) redirect('/admin/login')

  // is_super_admin は型定義外のため adminClient で個別取得
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const { data: superAdminRow } = await createAdminClient()
    .from('tmk_admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single()
  const isSuperAdmin = !!(superAdminRow as unknown as { is_super_admin?: boolean } | null)?.is_super_admin

  const displayName = adminRaw.display_name ?? user.email ?? ''

  const navItems = [
    { href: '/admin', label: 'ダッシュボード' },
    { href: '/admin/slots', label: '出発枠' },
    { href: '/admin/bookings', label: '予約' },
    { href: '/admin/hotels', label: 'ホテル' },
    { href: '/admin/invoices', label: '請求' },
    { href: '/admin/security', label: '🔒 セキュリティ' },
    ...(isSuperAdmin ? [{ href: '/admin/superadmin', label: '👑 スーパー管理者' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between relative">
          <div className="flex items-center gap-4 md:gap-8 min-w-0">
            <span className="font-bold text-sm tracking-wide whitespace-nowrap">MK シャトル</span>
            <AdminNavClient items={navItems} displayName={displayName} />
          </div>
          {/* Desktop: user info + logout */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <span className="text-xs text-slate-400">{displayName}</span>
            <form action={async () => { 'use server'; await logout('/admin/login') }}>
              <button type="submit" className="text-xs text-slate-400 hover:text-white transition">
                ログアウト
              </button>
            </form>
          </div>
          {/* Mobile: logout only (user name shown in hamburger area) */}
          <div className="flex md:hidden items-center shrink-0 ml-2">
            <form action={async () => { 'use server'; await logout('/admin/login') }}>
              <button type="submit" className="text-xs text-slate-400 hover:text-white transition px-2 py-1">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {children}
      </main>
    </div>
  )
}
