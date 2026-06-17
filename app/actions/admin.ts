'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { sendSuspensionNotice } from '@/lib/email'

export async function createSlot(formData: FormData): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const capacity = parseInt(formData.get('capacity') as string)
  const date = formData.get('date') as string
  const departureTime = formData.get('departure_time') as string

  // 締切時刻: 「何時間前」か「日時指定」か
  const cutoffMode = formData.get('cutoff_mode') as string
  let cutoffAt: string
  if (cutoffMode === 'hours_before') {
    const hours = parseInt(formData.get('cutoff_hours_before') as string)
    const depMs = new Date(`${date}T${departureTime}:00+09:00`).getTime()
    cutoffAt = new Date(depMs - hours * 3_600_000).toISOString()
  } else {
    cutoffAt = formData.get('cutoff_at') as string
  }

  const { data, error } = await supabase
    .from('shuttle_slots')
    .insert({
      date,
      departure_time: departureTime,
      capacity,
      remaining_seats: capacity,
      vehicle_type: formData.get('vehicle_type') as string,
      cutoff_at: cutoffAt,
      price_per_seat_yen: parseInt(formData.get('price_per_seat_yen') as string),
      notes: (formData.get('notes') as string) || null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/admin/slots/${data.id}`)
}

export async function createBulkSlots(
  formData: FormData
): Promise<{ error?: string; created?: number }> {
  const supabase = await createClient()

  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const weekdays = formData.getAll('weekdays') as string[]
  const departure_time = formData.get('departure_time') as string
  const capacity = parseInt(formData.get('capacity') as string)
  const vehicle_type = formData.get('vehicle_type') as string
  const price_per_seat_yen = parseInt(formData.get('price_per_seat_yen') as string)
  // cutoff は出発前日の 17:00 JST をデフォルトとする

  const slots: {
    date: string
    departure_time: string
    capacity: number
    remaining_seats: number
    vehicle_type: string
    cutoff_at: string
    price_per_seat_yen: number
    status: string
  }[] = []
  const current = new Date(startDate + 'T00:00:00+09:00')
  const end = new Date(endDate + 'T00:00:00+09:00')

  while (current <= end) {
    const dow = current.getDay().toString()
    if (weekdays.includes(dow)) {
      const y = current.getFullYear()
      const m = String(current.getMonth() + 1).padStart(2, '0')
      const d = String(current.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      const prevDay = new Date(current)
      prevDay.setDate(prevDay.getDate() - 1)
      const py = prevDay.getFullYear()
      const pm = String(prevDay.getMonth() + 1).padStart(2, '0')
      const pd = String(prevDay.getDate()).padStart(2, '0')
      const cutoffStr = `${py}-${pm}-${pd}T17:00:00+09:00`

      slots.push({
        date: dateStr,
        departure_time,
        capacity,
        remaining_seats: capacity,
        vehicle_type,
        cutoff_at: cutoffStr,
        price_per_seat_yen,
        status: 'open',
      })
    }
    current.setDate(current.getDate() + 1)
  }

  if (slots.length === 0) return { error: '指定した条件に該当する日付がありません' }

  const { error } = await supabase.from('shuttle_slots').insert(slots)
  if (error) return { error: error.message }

  return { created: slots.length }
}

export async function updateSlot(
  slotId: string,
  formData: FormData
): Promise<{ error?: string }> {
  // 管理者セッション確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です。' }
  const { data: admin } = await supabase.from('tmk_admin_users').select('id').eq('user_id', user.id).eq('is_active', true).single()
  if (!admin) return { error: '管理者権限が必要です。' }

  const newCapacity = parseInt(formData.get('capacity') as string)

  // RLSをバイパスして現在値を取得・更新
  const adminDb = createAdminClient()
  const { data: slot } = await adminDb
    .from('shuttle_slots')
    .select('capacity, remaining_seats, status')
    .eq('id', slotId)
    .single()

  if (!slot) return { error: 'スロットが見つかりません' }

  const bookedCount = slot.capacity - slot.remaining_seats
  if (newCapacity < bookedCount) {
    return { error: `定員を ${bookedCount} 名未満に設定できません（既に ${bookedCount} 名予約済）` }
  }

  const newRemaining = slot.remaining_seats + (newCapacity - slot.capacity)
  // 増席によって full → open に戻す場合
  const newStatus = slot.status === 'full' && newRemaining > 0 ? 'open' : slot.status

  const { error } = await adminDb.from('shuttle_slots').update({
    capacity: newCapacity,
    remaining_seats: newRemaining,
    status: newStatus,
    cutoff_at: formData.get('cutoff_at') as string,
    price_per_seat_yen: parseInt(formData.get('price_per_seat_yen') as string),
    notes: (formData.get('notes') as string) || null,
  }).eq('id', slotId)

  if (error) return { error: error.message }
  return {}
}

export async function updateSlotStatus(
  slotId: string,
  status: string
): Promise<{ error?: string }> {
  // 管理者セッション確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です。' }
  const { data: admin } = await supabase.from('tmk_admin_users').select('id').eq('user_id', user.id).eq('is_active', true).single()
  if (!admin) return { error: '管理者権限が必要です。' }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('shuttle_slots')
    .update({ status })
    .eq('id', slotId)
  if (error) return { error: error.message }

  // 運休確定時: 予約済みホテルへ通知メール
  if (status === 'suspended') {
    sendSuspensionEmails(adminDb, slotId).catch(e =>
      console.error('[email] 運休通知メール送信失敗:', e)
    )
  }

  return {}
}

async function sendSuspensionEmails(
  supabase: ReturnType<typeof createAdminClient>,
  slotId: string
) {
  const [slotRes, bookingsRes] = await Promise.all([
    supabase.from('shuttle_slots').select('date, departure_time').eq('id', slotId).single(),
    supabase
      .from('bookings')
      .select('guest_name, confirmation_code, party_size, hotel_id')
      .eq('slot_id', slotId)
      .eq('status', 'confirmed'),
  ])

  if (!slotRes.data || !bookingsRes.data?.length) return

  const slot = slotRes.data
  const bookings = bookingsRes.data

  // ホテルごとにグループ化して1通ずつ送信
  const byHotel: Record<string, typeof bookings> = {}
  for (const b of bookings) {
    byHotel[b.hotel_id] = byHotel[b.hotel_id] ?? []
    byHotel[b.hotel_id]!.push(b)
  }

  const hotelIds = Object.keys(byHotel)
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, contact_email')
    .in('id', hotelIds)

  for (const hotel of hotels ?? []) {
    if (!hotel.contact_email) continue
    await sendSuspensionNotice(hotel.contact_email, {
      hotelName: hotel.name,
      date: slot.date,
      departureTime: slot.departure_time,
      affectedBookings: (byHotel[hotel.id] ?? []).map(b => ({
        guestName: b.guest_name,
        confirmationCode: b.confirmation_code,
        partySize: b.party_size,
      })),
    })
  }
}

export async function cancelBookingByAdmin(
  bookingId: string,
  reason?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 既存の cancel_booking_by_hotel RPC を利用（残席復元込み）
  const { data, error } = await supabase.rpc('cancel_booking_by_hotel', {
    p_booking_id: bookingId,
    p_reason: reason ?? null,
  })

  if (error) return { error: error.message }
  if (data && typeof data === 'object' && 'error' in data) {
    return { error: (data as { error: string }).error }
  }
  return {}
}

export async function assignDriver(
  slotId: string,
  formData: FormData
): Promise<{ error?: string }> {
  // 管理者セッション確認（通常クライアント）
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です。' }

  const { data: admin } = await supabase
    .from('tmk_admin_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!admin) return { error: '管理者権限が必要です。' }

  const employeeCode = (formData.get('employee_code') as string).trim()

  // RLSをバイパスするためサービスロールクライアントでDELETE/INSERT
  const adminDb = createAdminClient()
  await adminDb.from('driver_assignments').delete().eq('slot_id', slotId)

  if (!employeeCode) return {}

  const { data: driver } = await adminDb
    .from('driver_users')
    .select('id')
    .eq('employee_code', employeeCode)
    .single()

  if (!driver) return { error: `乗務員コード "${employeeCode}" が見つかりません。` }

  const { error } = await adminDb.from('driver_assignments').insert({
    slot_id: slotId,
    employee_code: employeeCode,
    driver_id: driver.id,
    assigned_by: user.id,
  })
  if (error) return { error: error.message }
  return {}
}
