'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionResult = { error?: string; success?: boolean; link?: string | null }

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from('tmk_admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return (data as unknown as { is_super_admin: boolean } | null)?.is_super_admin ? user : null
}

export async function createHotelAccount(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const name = (formData.get('name') as string).trim()
  const pickup_address = (formData.get('pickup_address') as string).trim()
  const contact_name = (formData.get('contact_name') as string | null)?.trim() || null
  const billing_email = (formData.get('billing_email') as string | null)?.trim() || email

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const slug = `hotel-${Date.now().toString(36)}`
  const { error: dbError } = await adminClient.from('hotels').insert({
    name,
    slug,
    pickup_address,
    contact_name,
    contact_email: email,
    billing_email,
    auth_user_id: authData.user.id,
    is_active: true,
  })
  if (dbError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/admin/superadmin/users')
  return { success: true }
}

export async function createDriverAccount(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const display_name = (formData.get('display_name') as string).trim()
  const employee_code = (formData.get('employee_code') as string).trim()
  const driver_code = (formData.get('driver_code') as string | null)?.trim() || null
  const is_emirates_route = formData.get('is_emirates_route') === '1'

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error: dbError } = await adminClient.from('driver_users').insert({
    user_id: authData.user.id,
    display_name,
    employee_code,
    driver_code,
    is_emirates_route,
    is_active: true,
  })
  if (dbError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/admin/superadmin/users')
  return { success: true }
}

export async function createTmkAdminAccount(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const display_name = (formData.get('display_name') as string).trim()
  const is_super_admin = formData.get('is_super_admin') === '1'

  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error: dbError } = await adminClient.from('tmk_admin_users').insert({
    user_id: authData.user.id,
    display_name,
    is_super_admin,
    is_active: true,
  } as Parameters<ReturnType<typeof adminClient.from>['insert']>[0])
  if (dbError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/admin/superadmin/users')
  return { success: true }
}

export async function toggleUserActive(formData: FormData): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const table = formData.get('table') as 'hotels' | 'driver_users' | 'tmk_admin_users'
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'

  const adminClient = createAdminClient()
  const { error } = await adminClient.from(table).update({ is_active } as Record<string, boolean>).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/superadmin/users')
  return { success: true }
}

export async function updateCancellationPolicy(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません' }

  const thresholdHours = parseFloat(formData.get('threshold_hours') as string)
  const feePct = parseInt(formData.get('fee_pct') as string, 10)
  const note = (formData.get('note') as string)?.trim() || null

  if (isNaN(thresholdHours) || thresholdHours <= 0) return { error: '閾値時間数は正の数を入力してください' }
  if (isNaN(feePct) || feePct < 0 || feePct > 100) return { error: 'キャンセル料率は 0〜100 の整数で入力してください' }

  const adminDb = createAdminClient()

  const { data: adminUser } = await adminDb
    .from('tmk_admin_users')
    .select('name')
    .eq('user_id', caller.id)
    .single()

  const updaterName = (adminUser as unknown as { name?: string } | null)?.name ?? caller.email ?? 'unknown'

  // 唯一の行を upsert（なければ INSERT、あれば UPDATE）
  const { data: existing } = await adminDb
    .from('cancellation_policies')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await adminDb
      .from('cancellation_policies')
      .update({
        threshold_hours: thresholdHours,
        fee_pct: feePct,
        note,
        updated_at: new Date().toISOString(),
        updated_by_name: updaterName,
      })
      .eq('id', existing.id)
  } else {
    await adminDb.from('cancellation_policies').insert({
      threshold_hours: thresholdHours,
      fee_pct: feePct,
      note,
      updated_by_name: updaterName,
    })
  }

  revalidatePath('/admin/superadmin/settings')
  return { success: true }
}

export async function generatePasswordResetLink(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const caller = await verifySuperAdmin()
  if (!caller) return { error: '権限がありません', link: null }

  const email = formData.get('email') as string
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/admin` },
  })
  if (error) return { error: error.message, link: null }
  return { link: data.properties.action_link, error: undefined }
}
