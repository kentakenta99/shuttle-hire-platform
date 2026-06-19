import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { logout } from '@/app/actions/auth'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/driver/login')

  const { data: driver } = await supabase
    .from('driver_users')
    .select('display_name, employee_code')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!driver) redirect('/driver/login')

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-[#C9A227]/30 sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Image src="/logo-mk.png" alt="東京MK" width={32} height={32} className="rounded-lg" />
            <div>
              <p className="text-sm font-medium leading-tight">
                {driver.display_name ?? driver.employee_code}
              </p>
              <p className="text-xs text-[#C9A227]/70 leading-tight">シャトルハイヤー</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/driver" className="text-xs text-gray-400 hover:text-[#C9A227] transition px-2 py-1 rounded hover:bg-white/5">
              担当便
            </Link>
            <form action={async () => { 'use server'; await logout('/driver/login') }}>
              <button type="submit" className="text-xs text-gray-600 hover:text-gray-400 transition">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5">
        {children}
      </main>
    </div>
  )
}
