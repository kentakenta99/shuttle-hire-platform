'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type RequestResult = { error: string } | { success: true; requestId: string }

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MINUTES = 60

async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export async function submitBookingRequest(formData: FormData): Promise<RequestResult> {
  const hotelId     = formData.get('hotelId') as string
  const roomNumber  = (formData.get('roomNumber') as string)?.trim()
  const guestName   = (formData.get('guestName') as string)?.trim()
  const partySize   = parseInt(formData.get('partySize') as string)
  const luggageCount = parseInt(formData.get('luggageCount') as string)
  const preferredDate = formData.get('preferredDate') as string
  const preferredTime = formData.get('preferredTime') as string
  const flightNumber  = (formData.get('flightNumber') as string)?.trim().toUpperCase()
  const guestEmail    = (formData.get('guestEmail') as string)?.trim() || null
  const notes         = (formData.get('notes') as string)?.trim() || null

  if (!hotelId || !roomNumber || !guestName || !partySize || !preferredDate || !preferredTime || !flightNumber) {
    return { error: '必須項目を入力してください。' }
  }
  if (partySize < 1 || partySize > 6) return { error: '人数が不正です。' }
  if (luggageCount < 0 || luggageCount > 12) return { error: '荷物数が不正です。' }

  const ipAddress = await getClientIp()

  // レートリミット：同IPから1時間以内に3件超はブロック
  const adminDb = createAdminClient()
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count } = await adminDb
    .from('booking_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return { error: 'リクエストが多すぎます。しばらく経ってから再度お試しください。' }
  }

  const { data, error } = await adminDb
    .from('booking_requests')
    .insert({
      hotel_id:       hotelId,
      room_number:    roomNumber,
      guest_name:     guestName,
      party_size:     partySize,
      luggage_count:  luggageCount,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      flight_number:  flightNumber,
      guest_email:    guestEmail,
      notes,
      ip_address:     ipAddress,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'エラーが発生しました。もう一度お試しください。' }
  return { success: true, requestId: data.id }
}

export async function convertRequestToBooking(
  requestId: string,
  slotId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '権限がありません。' }

  const adminDb = createAdminClient()

  // リクエスト取得
  const { data: req } = await adminDb
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!req) return { error: 'リクエストが見つかりません。' }
  if (req.status !== 'pending') return { error: 'このリクエストはすでに処理済みです。' }

  // ホテル権限確認（ログインユーザーが req.hotel_id のスタッフか検証）
  const { data: hotel } = await adminDb
    .from('hotels')
    .select('id, name, contact_email')
    .eq('id', req.hotel_id)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!hotel) return { error: '操作権限がありません。' }

  // 予約作成
  const { data: bookingResult, error: bookingError } = await adminDb.rpc('create_booking', {
    p_slot_id:        slotId,
    p_hotel_id:       req.hotel_id,
    p_guest_name:     req.guest_name,
    p_party_size:     req.party_size,
    p_flight_number:  req.flight_number,
    p_luggage_count:  req.luggage_count,
    p_notes:          req.notes ?? undefined,
    p_booked_by_name: `リクエスト確定 (客室: ${req.room_number})`,
  })

  if (bookingError) return { error: bookingError.message }
  const result = bookingResult as { error?: string; booking_id?: string }
  if (result.error === 'SLOT_UNAVAILABLE') return { error: '選択した便は満席または締切済みです。' }
  if (result.error) return { error: 'booking作成エラー: ' + result.error }

  const bookingId = result.booking_id!

  // ゲストメールを booking に保存
  if (req.guest_email) {
    await adminDb.from('service_orders').update({ guest_email: req.guest_email }).eq('id', bookingId)
  }

  // リクエストを confirmed に更新
  await adminDb
    .from('booking_requests')
    .update({ status: 'confirmed', converted_booking_id: bookingId })
    .eq('id', requestId)

  // QRチケットメールを送信
  if (req.guest_email) {
    const { data: booking } = await adminDb
      .from('service_orders')
      .select('*, shuttle_slots(date, departure_time)')
      .eq('id', bookingId)
      .single()

    if (booking) {
      const slot = booking.shuttle_slots as { date: string; departure_time: string } | null
      if (slot) {
        const { sendGuestBookingConfirmation } = await import('@/lib/email')
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
        await sendGuestBookingConfirmation(req.guest_email, {
          guestName:        req.guest_name,
          bookingReference: booking.booking_reference,
          confirmUrl:       `${baseUrl}/confirm/${booking.booking_reference}`,
          date:             slot.date,
          departureTime:    slot.departure_time,
          partySize:        req.party_size,
          luggageCount:     req.luggage_count,
          flightNumber:     req.flight_number,
          notes:            req.notes ?? null,
          hotelName:        hotel.name,
        }).catch(e => console.error('[email] QRチケット送信失敗:', e))
      }
    }
  }

  return {}
}

export type RequestStatusResult =
  | { status: 'pending' }
  | { status: 'rejected' }
  | {
      status: 'confirmed'
      bookingReference: string
      confirmUrl: string
      qrDataUrl: string
      date: string
      departureTime: string
      partySize: number
      hotelName: string
    }

export async function checkRequestStatus(requestId: string): Promise<RequestStatusResult> {
  const adminDb = createAdminClient()

  const { data: req } = await adminDb
    .from('booking_requests')
    .select('status, converted_booking_id, party_size')
    .eq('id', requestId)
    .single()

  if (!req || req.status === 'pending') return { status: 'pending' }
  if (req.status === 'rejected') return { status: 'rejected' }

  const { data: booking } = await adminDb
    .from('service_orders')
    .select('booking_reference, party_size, shuttle_slots(date, departure_time), hotels(name)')
    .eq('id', req.converted_booking_id)
    .single()

  if (!booking) return { status: 'pending' }

  const slotRaw = booking.shuttle_slots as unknown
  const slot = (Array.isArray(slotRaw) ? slotRaw[0] : slotRaw) as { date: string; departure_time: string } | null
  const hotelRaw = booking.hotels as unknown
  const hotel = (Array.isArray(hotelRaw) ? hotelRaw[0] : hotelRaw) as { name: string } | null

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shuttle-hire-platform.vercel.app'
  const confirmUrl = `${baseUrl}/confirm/${booking.booking_reference}`

  const QRCodeLib = (await import('qrcode')).default
  const qrDataUrl = await QRCodeLib.toDataURL(confirmUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return {
    status: 'confirmed',
    bookingReference: booking.booking_reference,
    confirmUrl,
    qrDataUrl,
    date: slot?.date ?? '',
    departureTime: slot?.departure_time ?? '',
    partySize: (booking.party_size as number | null) ?? (req.party_size as number),
    hotelName: hotel?.name ?? '',
  }
}

// ゲスト自身によるリクエスト取り消し（pending のみ。ホテル承認後は guestCancelBooking を使う）
export async function cancelBookingRequest(requestId: string): Promise<{ error?: string }> {
  const adminDb = createAdminClient()

  const { data: req } = await adminDb
    .from('booking_requests')
    .select('status')
    .eq('id', requestId)
    .single()

  if (!req) return { error: 'リクエストが見つかりません。' }
  if (req.status !== 'pending') return { error: 'このリクエストはすでに処理済みのため取り消せません。' }

  const { error } = await adminDb
    .from('booking_requests')
    .update({ status: 'cancelled_by_guest' })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) return { error: 'エラーが発生しました。もう一度お試しください。' }
  return {}
}

export async function rejectBookingRequest(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '権限がありません。' }

  const adminDb = createAdminClient()

  // リクエストのホテルIDを取得し、ログインユーザーが所属するホテルか検証
  const { data: req } = await adminDb
    .from('booking_requests')
    .select('hotel_id')
    .eq('id', requestId)
    .single()
  if (!req) return { error: 'リクエストが見つかりません。' }

  const { data: hotel } = await adminDb
    .from('hotels')
    .select('id')
    .eq('id', req.hotel_id)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!hotel) return { error: '操作権限がありません。' }

  const { error } = await adminDb
    .from('booking_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)

  if (error) return { error: error.message }
  return {}
}
