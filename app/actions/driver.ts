'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAssignment(slotId: string) {
  const { error: authError, driver } = await getVerifiedDriver()
  if (authError || !driver) return { error: authError ?? '権限エラー', adminDb: null }

  const adminDb = createAdminClient()
  const { data: assignment } = await adminDb
    .from('driver_assignments')
    .select('id')
    .eq('slot_id', slotId)
    .eq('driver_id', driver.id)
    .single()

  if (!assignment) return { error: '担当便の権限がありません', adminDb: null }
  return { error: null, adminDb }
}

export async function markDeparted(slotId: string): Promise<{ error?: string }> {
  const { error, adminDb } = await verifyAssignment(slotId)
  if (error || !adminDb) return { error: error ?? '権限エラー' }

  const { error: dbError } = await adminDb
    .from('shuttle_slots')
    .update({ departed_at: new Date().toISOString() })
    .eq('id', slotId)
    .is('departed_at', null)

  if (dbError) return { error: dbError.message }
  return {}
}

export async function markArrived(slotId: string): Promise<{ error?: string }> {
  const { error, adminDb } = await verifyAssignment(slotId)
  if (error || !adminDb) return { error: error ?? '権限エラー' }

  const now = new Date().toISOString()

  const [slotRes, bookingRes] = await Promise.all([
    adminDb
      .from('shuttle_slots')
      .update({ arrived_at: now })
      .eq('id', slotId)
      .is('arrived_at', null),
    adminDb
      .from('bookings')
      .update({ status: 'arrived', completed_at: now })
      .eq('slot_id', slotId)
      .eq('status', 'completed'),
  ])

  if (slotRes.error) return { error: slotRes.error.message }
  if (bookingRes.error) return { error: bookingRes.error.message }
  return {}
}

async function getVerifiedDriver() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です', supabase, driver: null }

  const { data: driver } = await supabase
    .from('driver_users')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!driver) return { error: '乗務員権限が必要です', supabase, driver: null }
  return { error: null, supabase, driver }
}

export async function markBoarded(
  bookingId: string
): Promise<{ error?: string }> {
  const { error: authError, driver } = await getVerifiedDriver()
  if (authError || !driver) return { error: authError ?? '権限エラー' }

  const adminDb = createAdminClient()

  const { data: booking } = await adminDb
    .from('bookings')
    .select('id, slot_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: '予約が見つかりません' }
  if (booking.status === 'completed') return {}
  if (booking.status !== 'confirmed') return { error: 'この予約はキャンセルされています' }

  const { data: assignment } = await adminDb
    .from('driver_assignments')
    .select('id')
    .eq('slot_id', booking.slot_id)
    .eq('driver_id', driver.id)
    .single()

  if (!assignment) return { error: '担当便の権限がありません' }

  const { error } = await adminDb
    .from('bookings')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) return { error: error.message }
  return {}
}

export async function markNoShow(
  bookingId: string
): Promise<{ error?: string; guestName?: string }> {
  const { error: authError, driver } = await getVerifiedDriver()
  if (authError || !driver) return { error: authError ?? '権限エラー' }

  const adminDb = createAdminClient()

  const { data: booking } = await adminDb
    .from('bookings')
    .select('id, slot_id, status, guest_name')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: '予約が見つかりません' }
  if (booking.status !== 'confirmed') return { error: '搭乗前の予約にのみ使用できます' }

  const { data: assignment } = await adminDb
    .from('driver_assignments')
    .select('id')
    .eq('slot_id', booking.slot_id)
    .eq('driver_id', driver.id)
    .single()

  if (!assignment) return { error: '担当便の権限がありません' }

  const { error } = await adminDb
    .from('bookings')
    .update({ status: 'no_show' })
    .eq('id', bookingId)

  if (error) return { error: error.message }
  return { guestName: booking.guest_name }
}

export async function markBoardedByCode(
  confirmationCode: string
): Promise<{ error?: string; guestName?: string }> {
  const { error: authError, driver } = await getVerifiedDriver()
  if (authError || !driver) return { error: authError ?? '権限エラー' }

  const adminDb = createAdminClient()

  // QRコードにURLが含まれる場合（例: https://xxx.com/confirm/TMK-...）もコードを抽出
  const rawInput = confirmationCode.trim()
  const code = rawInput.includes('/') ? (rawInput.split('/').pop() ?? rawInput).toUpperCase() : rawInput.toUpperCase()

  const { data: booking } = await adminDb
    .from('bookings')
    .select('id, slot_id, guest_name, status')
    .eq('confirmation_code', code)
    .single()

  if (!booking) return { error: '確認番号が見つかりません' }
  if (booking.status === 'completed') return { error: `${booking.guest_name} 様はすでに乗車確認済みです` }
  if (booking.status !== 'confirmed') return { error: 'この予約はキャンセルされています' }

  const { data: assignment } = await adminDb
    .from('driver_assignments')
    .select('id')
    .eq('slot_id', booking.slot_id)
    .eq('driver_id', driver.id)
    .single()

  if (!assignment) return { error: 'この便の担当権限がありません' }

  const { error } = await adminDb
    .from('bookings')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', booking.id)

  if (error) return { error: error.message }
  return { guestName: booking.guest_name }
}
