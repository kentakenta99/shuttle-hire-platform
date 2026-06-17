'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createSlot(formData: FormData): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const capacity = parseInt(formData.get('capacity') as string)
  const { data, error } = await supabase
    .from('shuttle_slots')
    .insert({
      date: formData.get('date') as string,
      departure_time: formData.get('departure_time') as string,
      capacity,
      remaining_seats: capacity,
      vehicle_type: formData.get('vehicle_type') as string,
      cutoff_at: formData.get('cutoff_at') as string,
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
  const supabase = await createClient()

  const newCapacity = parseInt(formData.get('capacity') as string)
  const { data: slot } = await supabase
    .from('shuttle_slots')
    .select('capacity, remaining_seats')
    .eq('id', slotId)
    .single()

  if (!slot) return { error: 'スロットが見つかりません' }

  const bookedCount = slot.capacity - slot.remaining_seats
  if (newCapacity < bookedCount) {
    return { error: `定員を ${bookedCount} 名未満に設定できません（既に ${bookedCount} 名予約済）` }
  }

  const { error } = await supabase.from('shuttle_slots').update({
    capacity: newCapacity,
    remaining_seats: slot.remaining_seats + (newCapacity - slot.capacity),
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
  const supabase = await createClient()
  const { error } = await supabase
    .from('shuttle_slots')
    .update({ status })
    .eq('id', slotId)
  if (error) return { error: error.message }
  return {}
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const employeeCode = (formData.get('employee_code') as string).trim()

  await supabase.from('driver_assignments').delete().eq('slot_id', slotId)

  if (!employeeCode) return {}

  const { data: driver } = await supabase
    .from('driver_users')
    .select('id')
    .eq('employee_code', employeeCode)
    .single()

  const { error } = await supabase.from('driver_assignments').insert({
    slot_id: slotId,
    employee_code: employeeCode,
    driver_id: driver?.id ?? null,
    assigned_by: user?.id ?? null,
  })
  if (error) return { error: error.message }
  return {}
}
