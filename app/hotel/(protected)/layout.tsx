import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SessionGuard from '@/app/components/SessionGuard'
import { logout } from '@/app/actions/auth'

export default async function HotelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/hotel/login')

  const { data: hotel } = await supabase
    .from('hotels')
    .select('name, session_timeout_min')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!hotel) redirect('/hotel/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#C9A227] rounded flex items-center justify-center text-[9px] font-black text-black">MK</div>
              <span className="font-semibold text-white text-sm truncate max-w-[140px]">{hotel.name}</span>
            </div>
            <nav className="flex gap-1">
              <Link
                href="/hotel/calendar"
                className="px-3 py-1.5 rounded-lg text-sm text-[#C9A227]/80 hover:bg-white/10 hover:text-[#C9A227] transition"
              >
                空き枠
              </Link>
              <Link
                href="/hotel/bookings"
                className="px-3 py-1.5 rounded-lg text-sm text-[#C9A227]/80 hover:bg-white/10 hover:text-[#C9A227] transition"
              >
                予約履歴
              </Link>
            </nav>
          </div>
          <form action={async () => { 'use server'; await logout('/hotel/login') }}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-white transition">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <SessionGuard timeoutMin={hotel.session_timeout_min} loginPath="/hotel/login" />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
