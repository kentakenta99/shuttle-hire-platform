'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

type LoginResult = { error: string } | never

async function logAuthEvent(data: {
  event_type: 'login_success' | 'login_failed' | 'login_unauthorized'
  role: 'hotel_staff' | 'tmk_admin' | 'driver'
  email: string
  user_id?: string
}) {
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
    const ua = (h.get('user-agent') ?? 'unknown').slice(0, 200)
    await createAdminClient().from('auth_events').insert({ ...data, ip_address: ip, user_agent: ua })
  } catch {
    // ログ失敗はサイレントに無視（認証フローを止めない）
  }
}

export async function loginAsHotelStaff(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error || !user) {
    await logAuthEvent({ event_type: 'login_failed', role: 'hotel_staff', email })
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }

  const { data: hotel } = await supabase.from('hotels').select('id').eq('auth_user_id', user.id).single()

  if (!hotel) {
    await supabase.auth.signOut()
    await logAuthEvent({ event_type: 'login_unauthorized', role: 'hotel_staff', email, user_id: user.id })
    return { error: 'このアカウントにホテルスタッフ権限がありません。' }
  }

  await logAuthEvent({ event_type: 'login_success', role: 'hotel_staff', email, user_id: user.id })
  redirect('/hotel/calendar')
}

export async function loginAsAdmin(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error || !user) {
    await logAuthEvent({ event_type: 'login_failed', role: 'tmk_admin', email })
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }

  const { data: admin } = await supabase.from('tmk_admin_users').select('id').eq('user_id', user.id).eq('is_active', true).single()

  if (!admin) {
    await supabase.auth.signOut()
    await logAuthEvent({ event_type: 'login_unauthorized', role: 'tmk_admin', email, user_id: user.id })
    return { error: 'このアカウントに管理者権限がありません。' }
  }

  await logAuthEvent({ event_type: 'login_success', role: 'tmk_admin', email, user_id: user.id })
  redirect('/admin')
}

export async function loginAsDriver(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error || !user) {
    await logAuthEvent({ event_type: 'login_failed', role: 'driver', email })
    return { error: 'メールアドレスまたはパスワードが正しくありません。' }
  }

  const { data: driver } = await supabase.from('driver_users').select('id').eq('user_id', user.id).eq('is_active', true).single()

  if (!driver) {
    await supabase.auth.signOut()
    await logAuthEvent({ event_type: 'login_unauthorized', role: 'driver', email, user_id: user.id })
    return { error: 'このアカウントにドライバー権限がありません。' }
  }

  await logAuthEvent({ event_type: 'login_success', role: 'driver', email, user_id: user.id })
  redirect('/driver')
}

export async function logout(redirectTo: string = '/') {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(redirectTo)
}
