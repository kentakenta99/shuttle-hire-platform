'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { sendBookingConfirmation, sendGuestBookingConfirmation, sendCancellationNotice } from '@/lib/email'

export async function createBooking(formData: FormData): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const slotId = formData.get('slotId') as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '操作権限がありません。' }

  // RLS を経由せず admin client でホテルを取得（RLS セッション問題を回避）
  const adminDb = createAdminClient()
  const { data: hotel } = await adminDb
    .from('hotels')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!hotel) return { error: '操作権限がありません。' }

  const { data, error } = await supabase.rpc('create_booking', {
    p_slot_id:        slotId,
    p_hotel_id:       hotel.id,
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

  // ゲストメールのみ保存（unit_price/total_price は create_booking RPC が recalculate_slot_pricing で設定済み）
  const guestEmail = (formData.get('guestEmail') as string)?.trim() || null
  if (guestEmail) {
    await supabase.from('bookings').update({ guest_email: guestEmail }).eq('id', bookingId)
  }

  // redirect()前に完了させる（Vercelサーバーレスではawaitしないと関数終了でキャンセルされる）
  await sendBookingConfirmationEmail(supabase, bookingId, guestEmail).catch(e =>
    console.error('[email] 予約確定メール送信失敗:', e)
  )

  redirect(`/hotel/bookings/${bookingId}?new=1`)
}

async function sendBookingConfirmationEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  guestEmail?: string | null
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time), hotels(name, contact_email)')
    .eq('id', bookingId)
    .single()

  if (!booking) return
  const slot = booking.shuttle_slots as { date: string; departure_time: string } | null
  const hotel = booking.hotels as { name: string; contact_email: string | null } | null
  if (!slot || !hotel) return

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const emailInfo = {
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
  }

  // ホテルへの通知メール
  if (hotel.contact_email) {
    await sendBookingConfirmation(hotel.contact_email, emailInfo)
  }

  // ゲストへの直接送信（Cフロー）
  if (guestEmail) {
    await sendGuestBookingConfirmation(guestEmail, emailInfo)
  }
}

export async function cancelBooking(
  bookingId: string,
  reason?: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '操作権限がありません。' }

  const adminDb = createAdminClient()
  const { data: hotel } = await adminDb
    .from('hotels')
    .select('id, name, contact_email')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!hotel) return { error: '操作権限がありません。' }

  // キャンセル前に情報を取得（メール用）
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time)')
    .eq('id', bookingId)
    .single()

  const { data, error } = await supabase.rpc('cancel_booking_by_hotel', {
    p_booking_id: bookingId,
    p_hotel_id:   hotel.id,
    p_reason:     reason ?? null,
  })

  if (error) return { error: 'システムエラーが発生しました。' }

  const result = data as { error?: string; success?: boolean }
  if (result.error === 'PAST_CUTOFF') return { error: '締切時刻を過ぎているためキャンセルできません。配車センターにご連絡ください。' }
  if (result.error === 'BOOKING_NOT_FOUND') return { error: '予約が見つかりません。' }
  if (result.error) return { error: 'エラーが発生しました。' }

  const slot = booking?.shuttle_slots as { date: string; departure_time: string } | null
  if (booking && slot) {
    const cancelInfo = {
      guestName:        booking.guest_name,
      confirmationCode: booking.confirmation_code,
      date:             slot.date,
      departureTime:    slot.departure_time,
      reason,
      hotelName:        hotel.name,
    }
    // ホテルへの通知
    if (hotel.contact_email) {
      sendCancellationNotice(hotel.contact_email, cancelInfo)
        .catch(e => console.error('[email] キャンセル通知（ホテル）失敗:', e))
    }
    // ゲストへの通知（メール登録がある場合）
    if (booking.guest_email) {
      sendCancellationNotice(booking.guest_email, cancelInfo)
        .catch(e => console.error('[email] キャンセル通知（ゲスト）失敗:', e))
    }
  }

  return { success: true }
}
