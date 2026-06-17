'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type LoginResult = { error: string } | never

export async function loginAsHotelStaff(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  // ホテルスタッフかどうか確認
  const { data: hotel } = await supabase
    .from('hotels')
    .select('id')
    .not('auth_user_id', 'is', null)
    .single()

  if (!hotel) {
    await supabase.auth.signOut()
    return { error: 'このアカウントにホテルスタッフ権限がありません。' }
  }

  redirect('/hotel/calendar')
}

export async function loginAsAdmin(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  const { data: admin } = await supabase
    .from('tmk_admin_users')
    .select('id')
    .eq('is_active', true)
    .single()

  if (!admin) {
    await supabase.auth.signOut()
    return { error: 'このアカウントに管理者権限がありません。' }
  }

  redirect('/admin/dashboard')
}

export async function loginAsDriver(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: 'メールアドレスまたはパスワードが正しくありません。' }

  const { data: driver } = await supabase
    .from('driver_users')
    .select('id')
    .eq('is_active', true)
    .single()

  if (!driver) {
    await supabase.auth.signOut()
    return { error: 'このアカウントにドライバー権限がありません。' }
  }

  redirect('/driver/today')
}

export async function logout(redirectTo: string = '/') {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(redirectTo)
}
