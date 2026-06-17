import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BookingFilters from './BookingFilters'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ date?: string; hotel?: string; status?: string }>
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: '確定',       cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-100 text-red-700' },
  completed: { label: '完了',       cls: 'bg-gray-100 text-gray-600' },
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
    .from('bookings')
    .select('id, confirmation_code, guest_name, party_size, luggage_count, flight_number, status, created_at, hotel_id, slot_id')
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
        <a
          href={`/api/admin/bookings/csv?${csvParams.toString()}`}
          className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
        >
          CSV出力
        </a>
      </div>

      <BookingFilters hotels={hotels ?? []} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtered.length} 件
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">該当する予約がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">確認番号</th>
                  <th className="text-left px-4 py-3 font-medium">お客様名</th>
                  <th className="text-left px-4 py-3 font-medium">ホテル</th>
                  <th className="text-left px-4 py-3 font-medium">出発日時</th>
                  <th className="text-center px-4 py-3 font-medium">人数</th>
                  <th className="text-center px-4 py-3 font-medium">荷物</th>
                  <th className="text-left px-4 py-3 font-medium">フライト</th>
                  <th className="text-left px-4 py-3 font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(b => {
                  const slot = slotMap[b.slot_id]
                  const s = STATUS_LABEL[b.status] ?? { label: b.status, cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {b.confirmation_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/admin/bookings/${b.id}`} className="hover:text-blue-600 transition">
                          {b.guest_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{hotelMap[b.hotel_id] ?? '─'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {slot ? `${slot.date} ${slot.departure_time.slice(0, 5)}` : '─'}
                      </td>
                      <td className="px-4 py-3 text-center">{b.party_size}名</td>
                      <td className="px-4 py-3 text-center">{b.luggage_count}個</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.flight_number}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
