'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { sendSuspensionNotice, sendCancellationNotice } from '@/lib/email'

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
    vehicle_plate: (formData.get('vehicle_plate') as string) || null,
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です。' }

  const adminDb = createAdminClient()

  // 管理者権限確認
  const { data: admin } = await adminDb
    .from('tmk_admin_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!admin) return { error: '管理者権限が必要です。' }

  // キャンセル前に予約情報を取得（hotel_id特定 + メール送信用）
  const { data: booking } = await adminDb
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time), hotels(name, contact_email)')
    .eq('id', bookingId)
    .single()
  if (!booking) return { error: '予約が見つかりません。' }

  const hotel = booking.hotels as { name: string; contact_email: string | null } | null
  const slot  = booking.shuttle_slots as { date: string; departure_time: string } | null

  // admin client + p_hotel_id を明示して RPC を呼ぶ（auth.uid() によるホテル検索を回避）
  const { data, error } = await adminDb.rpc('cancel_booking_by_hotel', {
    p_booking_id: bookingId,
    p_hotel_id:   booking.hotel_id,
    p_reason:     reason ?? null,
  })

  if (error) return { error: error.message }
  const result = data as { error?: string }
  if (result?.error === 'PAST_CUTOFF') return { error: '締切時刻を過ぎているためキャンセルできません。' }
  if (result?.error) return { error: result.error }

  // キャンセル通知メール
  if (slot) {
    const cancelInfo = {
      guestName:        booking.guest_name,
      confirmationCode: booking.confirmation_code,
      date:             slot.date,
      departureTime:    slot.departure_time,
      reason,
      hotelName:        hotel?.name ?? '',
    }
    if (hotel?.contact_email) {
      sendCancellationNotice(hotel.contact_email, cancelInfo)
        .catch(e => console.error('[email] 管理者キャンセル通知（ホテル）失敗:', e))
    }
    if (booking.guest_email) {
      sendCancellationNotice(booking.guest_email, cancelInfo)
        .catch(e => console.error('[email] 管理者キャンセル通知（ゲスト）失敗:', e))
    }
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

// ── ホテル設定 ──────────────────────────────────────────────

export async function saveHotelPricing(
  hotelId: string,
  billingType: string,
  tiers: { party_size: number; per_person_price: number }[]
): Promise<{ error?: string }> {
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

  const adminDb = createAdminClient()

  const [billingRes] = await Promise.all([
    adminDb.from('hotels').update({ billing_type: billingType }).eq('id', hotelId),
  ])
  if (billingRes.error) return { error: billingRes.error.message }

  // 料金ティア: 全削除→再挿入（upsert）
  await adminDb.from('hotel_pricing_tiers').delete().eq('hotel_id', hotelId)
  if (tiers.length > 0) {
    const { error } = await adminDb.from('hotel_pricing_tiers').insert(
      tiers.map(t => ({ hotel_id: hotelId, party_size: t.party_size, per_person_price: t.per_person_price }))
    )
    if (error) return { error: error.message }
  }
  return {}
}

// ── 乗務員シャトル適格設定 ──────────────────────────────────

export async function updateDriverShuttleEligibility(
  driverId: string,
  isEligible: boolean,
  score: number
): Promise<{ error?: string }> {
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

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('driver_users')
    .update({ is_shuttle_eligible: isEligible, shuttle_score: score })
    .eq('id', driverId)

  if (error) return { error: error.message }
  return {}
}

// ── 月次請求生成 ──────────────────────────────────────────────

function findTierPrice(
  tiers: { party_size: number; per_person_price: number }[],
  partySize: number
): number {
  const match = tiers
    .filter(t => t.party_size <= partySize)
    .sort((a, b) => b.party_size - a.party_size)[0]
  return match?.per_person_price ?? 0
}

export async function generateMonthlyInvoice(
  hotelId: string,
  yearMonth: string // "YYYY-MM"
): Promise<{ error?: string; result?: { bookings: number; seats: number; amount: number } }> {
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

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return { error: '年月の形式が不正です。' }

  const adminDb = createAdminClient()

  const { data: hotel } = await adminDb
    .from('hotels')
    .select('billing_type')
    .eq('id', hotelId)
    .single()
  if (!hotel) return { error: 'ホテルが見つかりません。' }
  if (hotel.billing_type !== 'hotel_invoice') {
    return { error: 'このホテルは車内決済のため請求書は不要です。' }
  }

  // 入金済みは再生成不可
  const { data: existing } = await adminDb
    .from('monthly_invoices')
    .select('id, invoice_status')
    .eq('hotel_id', hotelId)
    .eq('year_month', yearMonth)
    .maybeSingle()
  if (existing?.invoice_status === 'paid') {
    return { error: '入金済みの請求書は再生成できません。' }
  }

  // 対象月の日付範囲
  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = `${yearMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`

  // 対象月の出発枠 ID
  const { data: slots } = await adminDb
    .from('shuttle_slots')
    .select('id')
    .gte('date', startDate)
    .lte('date', endDate)
  const slotIds = (slots ?? []).map(s => s.id)
  if (slotIds.length === 0) {
    return { error: `${yearMonth} に出発枠がありません。` }
  }

  // completed / arrived 予約のみ集計（total_price は動的スロット料金が反映済み）
  const { data: bookings } = await adminDb
    .from('bookings')
    .select('id, party_size, total_price')
    .eq('hotel_id', hotelId)
    .in('slot_id', slotIds)
    .in('status', ['completed', 'arrived'])
  if (!bookings || bookings.length === 0) {
    return { error: `${yearMonth} に完了済み予約がありません。` }
  }

  // フォールバック用ティア（total_price が null の旧予約向け）
  const { data: tiers } = await adminDb
    .from('hotel_pricing_tiers')
    .select('party_size, per_person_price')
    .eq('hotel_id', hotelId)
  const tiersData = tiers ?? []

  let totalAmount = 0
  let totalSeats = 0
  for (const b of bookings) {
    totalSeats += b.party_size
    totalAmount += (b.total_price as number | null) ?? (findTierPrice(tiersData, b.party_size) * b.party_size)
  }

  // 既存なら金額のみ更新・新規なら draft で挿入
  if (existing) {
    const { error: updateError } = await adminDb
      .from('monthly_invoices')
      .update({ total_bookings: bookings.length, total_seats: totalSeats, total_amount_yen: totalAmount })
      .eq('id', existing.id)
    if (updateError) return { error: updateError.message }
  } else {
    const { error: insertError } = await adminDb
      .from('monthly_invoices')
      .insert({
        hotel_id: hotelId,
        year_month: yearMonth,
        total_bookings: bookings.length,
        total_seats: totalSeats,
        total_amount_yen: totalAmount,
        invoice_status: 'draft',
      })
    if (insertError) return { error: insertError.message }
  }

  return { result: { bookings: bookings.length, seats: totalSeats, amount: totalAmount } }
}
