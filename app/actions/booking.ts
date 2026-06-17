'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createBooking(formData: FormData): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const slotId = formData.get('slotId') as string

  const { data, error } = await supabase.rpc('create_booking', {
    p_slot_id:        slotId,
    p_guest_name:     formData.get('guestName') as string,
    p_party_size:     Number(formData.get('partySize')),
    p_flight_number:  formData.get('flightNumber') as string,
    p_luggage_count:  Number(formData.get('luggageCount')),
    p_notes:          (formData.get('notes') as string) || undefined,
    p_booked_by_name: (formData.get('bookedByName') as string) || undefined,
  })

  if (error) return { error: 'システムエラーが発生しました。もう一度お試しください。' }

  const result = data as { error?: string; booking_id?: string }
  if (result.error === 'SLOT_UNAVAILABLE') {
    return { error: 'この便は満席または締切済みです。別の便をお選びください。' }
  }
  if (result.error === 'UNAUTHORIZED') {
    return { error: '操作権限がありません。' }
  }
  if (result.error) {
    return { error: 'エラーが発生しました。' }
  }

  redirect(`/hotel/bookings/${result.booking_id}?new=1`)
}

export async function cancelBooking(bookingId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('cancel_booking_by_hotel', {
    p_booking_id: bookingId,
  })

  if (error) return { error: 'システムエラーが発生しました。' }

  const result = data as { error?: string; success?: boolean }
  if (result.error === 'PAST_CUTOFF') return { error: '締切時刻を過ぎているためキャンセルできません。配車センターにご連絡ください。' }
  if (result.error === 'BOOKING_NOT_FOUND') return { error: '予約が見つかりません。' }
  if (result.error) return { error: 'エラーが発生しました。' }

  return { success: true }
}
