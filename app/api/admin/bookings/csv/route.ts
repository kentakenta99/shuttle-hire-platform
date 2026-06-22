import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: admin } = await supabase
    .from('tmk_admin_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!admin) return new NextResponse('Forbidden', { status: 403 })

  const sp = request.nextUrl.searchParams
  const date     = sp.get('date') ?? ''
  const hotelId  = sp.get('hotel') ?? ''
  const status   = sp.get('status') ?? ''

  let query = supabase
    .from('service_orders')
    .select('booking_reference, guest_name, party_size, luggage_count, flight_number, status, notes, booked_by_name, created_at, hotel_id, slot_id')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (status)  query = query.eq('status', status)
  if (hotelId) query = query.eq('hotel_id', hotelId)

  const { data: bookings } = await query
  const rows = bookings ?? []

  // スロット情報
  const slotIds = [...new Set(rows.map(b => b.slot_id))]
  const { data: slots } = slotIds.length > 0
    ? await supabase.from('shuttle_slots').select('id, date, departure_time').in('id', slotIds)
    : { data: [] }
  const slotMap = Object.fromEntries((slots ?? []).map(s => [s.id, s]))

  // ホテル情報
  const hotelIds = [...new Set(rows.map(b => b.hotel_id))]
  const { data: hotels } = hotelIds.length > 0
    ? await supabase.from('hotels').select('id, name').in('id', hotelIds)
    : { data: [] }
  const hotelMap = Object.fromEntries((hotels ?? []).map(h => [h.id, h.name]))

  // 日付フィルタ
  const filtered = date
    ? rows.filter(b => slotMap[b.slot_id]?.date === date)
    : rows

  function esc(v: string | number | null | undefined) {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const header = ['確認番号', 'お客様名', 'ホテル', '出発日', '出発時刻', '人数', '荷物', 'フライト番号', 'ステータス', '担当スタッフ', '予約日時', '備考']
  const csvRows = filtered.map(b => {
    const slot = slotMap[b.slot_id]
    return [
      esc(b.booking_reference),
      esc(b.guest_name),
      esc(hotelMap[b.hotel_id]),
      esc(slot?.date),
      esc(slot?.departure_time?.slice(0, 5)),
      esc(b.party_size),
      esc(b.luggage_count),
      esc(b.flight_number),
      esc(b.status),
      esc(b.booked_by_name),
      esc(new Date(b.created_at).toLocaleString('ja-JP')),
      esc(b.notes),
    ].join(',')
  })

  const csv = '﻿' + [header.join(','), ...csvRows].join('\r\n')
  const filename = `bookings_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
