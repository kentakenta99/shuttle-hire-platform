'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendBookingConfirmation, sendCancellationNotice } from '@/lib/email'

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
  if (result.error === 'UNAUTHORIZED') return { error: '操作権限がありません。' }
  if (result.error) return { error: 'エラーが発生しました。' }

  const bookingId = result.booking_id!

  // メール送信（非同期・失敗しても予約は完了扱い）
  sendBookingConfirmationEmail(supabase, bookingId).catch(e =>
    console.error('[email] 予約確定メール送信失敗:', e)
  )

  redirect(`/hotel/bookings/${bookingId}?new=1`)
}

async function sendBookingConfirmationEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time), hotels(name, contact_email)')
    .eq('id', bookingId)
    .single()

  if (!booking) return
  const slot = booking.shuttle_slots as { date: string; departure_time: string } | null
  const hotel = booking.hotels as { name: string; contact_email: string | null } | null
  if (!slot || !hotel?.contact_email) return

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  await sendBookingConfirmation(hotel.contact_email, {
    guestName: booking.guest_name,
    confirmationCode: booking.confirmation_code,
    confirmUrl: `${baseUrl}/confirm/${booking.confirmation_code}`,
    date: slot.date,
    departureTime: slot.departure_time,
    partySize: booking.party_size,
    luggageCount: booking.luggage_count,
    flightNumber: booking.flight_number,
    notes: booking.notes,
    hotelName: hotel.name,
  })
}

export async function cancelBooking(bookingId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  // キャンセル前に情報を取得（メール用）
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time), hotels(name, contact_email)')
    .eq('id', bookingId)
    .single()

  const { data, error } = await supabase.rpc('cancel_booking_by_hotel', {
    p_booking_id: bookingId,
  })

  if (error) return { error: 'システムエラーが発生しました。' }

  const result = data as { error?: string; success?: boolean }
  if (result.error === 'PAST_CUTOFF') return { error: '締切時刻を過ぎているためキャンセルできません。配車センターにご連絡ください。' }
  if (result.error === 'BOOKING_NOT_FOUND') return { error: '予約が見つかりません。' }
  if (result.error) return { error: 'エラーが発生しました。' }

  // キャンセル通知メール（非同期）
  if (booking) {
    const slot = booking.shuttle_slots as { date: string; departure_time: string } | null
    const hotel = booking.hotels as { name: string; contact_email: string | null } | null
    if (slot && hotel?.contact_email) {
      sendCancellationNotice(hotel.contact_email, {
        guestName: booking.guest_name,
        confirmationCode: booking.confirmation_code,
        date: slot.date,
        departureTime: slot.departure_time,
        hotelName: hotel.name,
      }).catch(e => console.error('[email] キャンセルメール送信失敗:', e))
    }
  }

  return { success: true }
}
