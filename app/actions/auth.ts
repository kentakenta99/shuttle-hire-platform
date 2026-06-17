'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type LoginResult = { error: string } | never

export async function loginAsHotelStaff(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error || !user) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!hotel) {
    await supabase.auth.signOut()
    return { error: 'このアカウントにホテルスタッフ権限がありません。' }
  }

  redirect('/hotel/calendar')
}

export async function loginAsAdmin(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error || !user) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  const { data: admin } = await supabase
    .from('tmk_admin_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) {
    await supabase.auth.signOut()
    return { error: 'このアカウントに管理者権限がありません。' }
  }

  redirect('/admin')
}

export async function loginAsDriver(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error || !user) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  const { data: driver } = await supabase
    .from('driver_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!driver) {
    await supabase.auth.signOut()
    return { error: 'このアカウントにドライバー権限がありません。' }
  }

  redirect('/driver')
}

export async function logout(redirectTo: string = '/') {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(redirectTo)
}
