import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: adminUser } = await supabase
    .from('tmk_admin_users')
    .select('display_name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!adminUser) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-sm tracking-wide">東京MK シャトル管理</span>
            <nav className="flex gap-0.5">
              {[
                { href: '/admin', label: 'ダッシュボード' },
                { href: '/admin/slots', label: '出発枠' },
                { href: '/admin/bookings', label: '予約' },
                { href: '/admin/hotels', label: 'ホテル' },
                { href: '/admin/invoices', label: '請求' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">{adminUser.display_name ?? user.email}</span>
            <form action={async () => { 'use server'; await logout('/admin/login') }}>
              <button type="submit" className="text-xs text-slate-400 hover:text-white transition">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
