import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDepartureReminderGuest, sendDepartureReminderHotel } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vercel Cron から呼ばれる（5分ごと）
// Authorization: Bearer CRON_SECRET で保護
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()

  // 出発14〜16分前のスロット（departure_notified_at IS NULL の未通知のみ）
  const { data: slots, error } = await adminDb.rpc('get_slots_for_departure_notification')

  if (error) {
    console.error('[cron/notify-departure] RPC error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!slots || slots.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  const confirmBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shuttle.tokyomk.com'
  let totalNotified = 0

  for (const slot of slots as {
    id: string
    date: string
    departure_time: string
    vehicle_type: string
    vehicle_plate: string | null
  }[]) {
    // このスロットの confirmed ゲスト（+ ホテル情報）を取得
    const { data: bookings } = await adminDb
      .from('service_orders')
      .select('id, guest_name, party_size, booking_reference, guest_email, hotel_id, hotels(name, contact_email)')
      .eq('slot_id', slot.id)
      .eq('status', 'confirmed')

    // 通知済みフラグを先に立てる（エラーが起きても重複送信しないため）
    await adminDb
      .from('shuttle_slots')
      .update({ departure_notified_at: new Date().toISOString() })
      .eq('id', slot.id)

    if (!bookings || bookings.length === 0) continue

    type Booking = {
      guest_name: string
      party_size: number
      booking_reference: string
      guest_email: string | null
      hotel_id: string
      hotels: { name: string; contact_email: string | null } | null
    }

    const typed = bookings as unknown as Booking[]

    // ゲスト個別メール
    await Promise.allSettled(
      typed
        .filter(b => b.guest_email)
        .map(b =>
          sendDepartureReminderGuest(b.guest_email!, {
            guestName: b.guest_name,
            bookingReference: b.booking_reference,
            date: slot.date,
            departureTime: slot.departure_time,
            vehicleType: slot.vehicle_type,
            vehiclePlate: slot.vehicle_plate,
            confirmUrl: `${confirmBase}/confirm/${b.booking_reference}`,
          })
        )
    )

    // ホテル別に集約して一括通知
    const byHotel = new Map<string, { hotel: { name: string; contact_email: string | null }; guests: Booking[] }>()
    for (const b of typed) {
      if (!b.hotels) continue
      const existing = byHotel.get(b.hotel_id)
      if (existing) {
        existing.guests.push(b)
      } else {
        byHotel.set(b.hotel_id, { hotel: b.hotels, guests: [b] })
      }
    }

    await Promise.allSettled(
      Array.from(byHotel.values())
        .filter(({ hotel }) => hotel.contact_email)
        .map(({ hotel, guests }) =>
          sendDepartureReminderHotel(hotel.contact_email!, {
            hotelName: hotel.name,
            date: slot.date,
            departureTime: slot.departure_time,
            vehicleType: slot.vehicle_type,
            vehiclePlate: slot.vehicle_plate,
            guests: guests.map(g => ({
              guestName: g.guest_name,
              partySize: g.party_size,
              bookingReference: g.booking_reference,
            })),
          })
        )
    )

    totalNotified += typed.length
  }

  return NextResponse.json({ notified: totalNotified, slots: slots.length })
}
