import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function yen(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

export default async function SuperAdminDashboard() {
  const adminDb = createAdminClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfMonthISO = startOfMonth.toISOString()
  const startOfMonthDate = startOfMonth.toISOString().split('T')[0]

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [bookingsRes, trendRes, slotsRes, hotelsRes, driversRes, adminsRes, hotelListRes] =
    await Promise.all([
      adminDb
        .from('bookings')
        .select('id, party_size, status, hotel_id, shuttle_slots(price_per_seat_yen)')
        .gte('created_at', startOfMonthISO),

      adminDb
        .from('bookings')
        .select('id, party_size, status, created_at, shuttle_slots(price_per_seat_yen)')
        .gte('created_at', sixMonthsAgo.toISOString())
        .neq('status', 'cancelled'),

      adminDb
        .from('shuttle_slots')
        .select('id, capacity, remaining_seats, date, status')
        .gte('date', startOfMonthDate)
        .neq('status', 'suspended'),

      adminDb.from('hotels').select('id', { count: 'exact', head: true }).eq('is_active', true),
      adminDb.from('driver_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      adminDb.from('tmk_admin_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      adminDb.from('hotels').select('id, name').eq('is_active', true),
    ])

  // 今月KPI
  const thisMonth = (bookingsRes.data ?? [])
  const active = thisMonth.filter(b => b.status !== 'cancelled')
  const cancelled = thisMonth.filter(b => b.status === 'cancelled')
  const totalBookings = active.length
  const totalPax = active.reduce((s, b) => s + b.party_size, 0)
  const estimatedRevenue = active.reduce((s, b) => {
    const slot = b.shuttle_slots as unknown as { price_per_seat_yen: number } | null
    return s + b.party_size * (slot?.price_per_seat_yen ?? 13500)
  }, 0)

  // 稼働率
  const slots = slotsRes.data ?? []
  const avgUtilization = slots.length > 0
    ? Math.round(
        slots.reduce((s, sl) =>
          s + (sl.capacity > 0 ? (sl.capacity - sl.remaining_seats) / sl.capacity : 0), 0)
        / slots.length * 100
      )
    : 0

  // 月次推移（6ヶ月）
  type MonthStat = { bookings: number; pax: number; revenue: number }
  const monthMap = new Map<string, MonthStat>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { bookings: 0, pax: 0, revenue: 0 })
  }
  for (const b of trendRes.data ?? []) {
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (!entry) continue
    const price = (b.shuttle_slots as unknown as { price_per_seat_yen: number } | null)?.price_per_seat_yen ?? 13500
    entry.bookings++
    entry.pax += b.party_size
    entry.revenue += b.party_size * price
  }
  const trend = [...monthMap.entries()].map(([month, d]) => ({ month, ...d }))
  const maxBookings = Math.max(...trend.map(t => t.bookings), 1)

  // ホテル別予約数
  const hotelBookingMap = new Map<string, number>()
  for (const b of active) hotelBookingMap.set(b.hotel_id, (hotelBookingMap.get(b.hotel_id) ?? 0) + 1)
  const hotelNameMap = new Map((hotelListRes.data ?? []).map(h => [h.id, h.name]))
  const hotelRanking = [...hotelBookingMap.entries()]
    .map(([id, count]) => ({ name: hotelNameMap.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const kpis = [
    { label: '今月の予約数', value: totalBookings.toLocaleString() + '件', sub: `キャンセル ${cancelled.length}件` },
    { label: '今月の推定売上', value: yen(estimatedRevenue), sub: `${totalPax}名分` },
    { label: '今月の平均稼働率', value: `${avgUtilization}%`, sub: `${slots.length}便対象` },
    { label: 'アクティブユーザー', value: `H${hotelsRes.count ?? 0} / DR${driversRes.count ?? 0} / A${adminsRes.count ?? 0}`, sub: 'ホテル / ドライバー / 管理者' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* 月次推移 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">月次予約推移（過去6ヶ月）</h2>
        <div className="flex items-end gap-2 h-36 mb-2">
          {trend.map(({ month, bookings }) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{bookings}</span>
              <div
                className="w-full bg-blue-500 rounded-t min-h-[4px]"
                style={{ height: `${Math.max(4, Math.round(bookings / maxBookings * 112))}px` }}
              />
              <span className="text-xs text-gray-500">{month.slice(5)}月</span>
            </div>
          ))}
        </div>
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left py-1.5">月</th>
              <th className="text-right">予約数</th>
              <th className="text-right">名数</th>
              <th className="text-right">推定売上</th>
            </tr>
          </thead>
          <tbody>
            {trend.map(({ month, bookings, pax, revenue }) => (
              <tr key={month} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-600">{month}</td>
                <td className="text-right font-medium">{bookings}</td>
                <td className="text-right text-gray-500">{pax}名</td>
                <td className="text-right text-gray-700">{yen(revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ホテル別予約 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">今月のホテル別予約数</h2>
          {hotelRanking.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">今月の予約データなし</p>
          ) : (
            <div className="space-y-2.5">
              {hotelRanking.map(({ name, count }, i) => {
                const pct = Math.round(count / Math.max(...hotelRanking.map(h => h.count), 1) * 100)
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-700 truncate">{name}</span>
                        <span className="text-xs font-semibold ml-2 shrink-0">{count}件</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 便別稼働率 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">今月の便別稼働率</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">今月の便データなし</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {[...slots]
                .sort((a, b) => a.date < b.date ? -1 : 1)
                .map(sl => {
                  const booked = sl.capacity - sl.remaining_seats
                  const pct = sl.capacity > 0 ? Math.round(booked / sl.capacity * 100) : 0
                  return (
                    <div key={sl.id} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12 shrink-0">{sl.date.slice(5)}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-orange-400' : 'bg-blue-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-20 text-right shrink-0">
                        {booked}/{sl.capacity}席 ({pct}%)
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
