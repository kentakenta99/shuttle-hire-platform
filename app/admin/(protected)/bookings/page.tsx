import { createClient } from '@/lib/supabase/server'
import BookingFilters from './BookingFilters'
import AdminBookingsClient from './AdminBookingsClient'
import RefreshButton from '@/app/components/RefreshButton'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ date?: string; hotel?: string; status?: string }>
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  const { date, hotel: hotelFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('service_orders')
    .select('id, booking_reference, guest_name, party_size, luggage_count, flight_number, status, created_at, hotel_id, slot_id')
    .order('created_at', { ascending: false })
    .limit(300)

  if (statusFilter && statusFilter !== '') query = query.eq('status', statusFilter)
  if (hotelFilter && hotelFilter !== '')   query = query.eq('hotel_id', hotelFilter)

  const { data: rawBookings } = await query
  const bookings = rawBookings ?? []

  // スロット情報を取得
  const slotIds = [...new Set(bookings.map(b => b.slot_id))]
  const { data: slots } = slotIds.length > 0
    ? await supabase.from('shuttle_slots').select('id, date, departure_time').in('id', slotIds)
    : { data: [] }

  const slotMap = Object.fromEntries((slots ?? []).map(s => [s.id, s]))
  const hotelMap = Object.fromEntries((hotels ?? []).map(h => [h.id, h.name]))

  const filtered = date
    ? bookings.filter(b => slotMap[b.slot_id]?.date === date)
    : bookings

  // CSV URL（クエリパラメータをそのまま渡す）
  const csvParams = new URLSearchParams()
  if (date) csvParams.set('date', date)
  if (hotelFilter) csvParams.set('hotel', hotelFilter)
  if (statusFilter) csvParams.set('status', statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">予約管理</h1>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <a
            href={`/api/admin/bookings/csv?${csvParams.toString()}`}
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
          >
            CSV出力
          </a>
        </div>
      </div>

      <BookingFilters hotels={hotels ?? []} />

      <AdminBookingsClient
        bookings={filtered}
        slotMap={slotMap}
        hotelMap={hotelMap}
      />
    </div>
  )
}
