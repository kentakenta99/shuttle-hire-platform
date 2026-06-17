import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:      { label: '受付中',   cls: 'bg-green-100 text-green-700' },
  full:      { label: '満席',     cls: 'bg-orange-100 text-orange-700' },
  closed:    { label: 'クローズ', cls: 'bg-gray-100 text-gray-500' },
  suspended: { label: '運休',     cls: 'bg-red-100 text-red-700' },
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function jstDateStr(d: Date) {
  const jst = new Date(d.getTime() + 9 * 3600_000)
  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth() + 1}/${dt.getDate()}（${wd}）`
}

function formatEventType(t: string) {
  if (t === 'booking_created') return '新規予約'
  if (t === 'booking_cancelled') return 'キャンセル'
  return t
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const todayStr = jstDateStr(now)
  const tomorrowStr = jstDateStr(new Date(now.getTime() + 86_400_000))
  const yearMonth = todayStr.slice(0, 7)

  const [slotsRes, eventsRes, monthlyRes] = await Promise.all([
    supabase
      .from('shuttle_slots')
      .select('*')
      .in('date', [todayStr, tomorrowStr])
      .order('date')
      .order('departure_time'),
    supabase
      .from('booking_events')
      .select('*')
      .in('event_type', ['booking_created', 'booking_cancelled'])
      .order('event_at', { ascending: false })
      .limit(10),
    (() => {
      const [y, m] = yearMonth.split('-').map(Number)
      const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      return supabase
        .from('bookings')
        .select('party_size')
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', `${yearMonth}-01T00:00:00+09:00`)
        .lt('created_at', `${nm}-01T00:00:00+09:00`)
    })(),
  ])

  const allSlots = slotsRes.data ?? []
  const todaySlots = allSlots.filter(s => s.date === todayStr)
  const tomorrowSlots = allSlots.filter(s => s.date === tomorrowStr)
  const events = eventsRes.data ?? []
  const monthly = monthlyRes.data ?? []
  const monthlyCount = monthly.length
  const monthlyPax = monthly.reduce((acc, b) => acc + b.party_size, 0)

  function SlotRow({ slot }: { slot: typeof allSlots[0] }) {
    const booked = slot.capacity - slot.remaining_seats
    const pct = slot.capacity > 0 ? Math.round((booked / slot.capacity) * 100) : 0
    const s = STATUS_LABEL[slot.status] ?? { label: slot.status, cls: 'bg-gray-100 text-gray-500' }
    return (
      <Link href={`/admin/slots/${slot.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg transition group">
        <span className="text-sm font-mono text-gray-700 w-16 shrink-0">
          {slot.departure_time.slice(0, 5)}
        </span>
        <span className="text-xs text-gray-400 w-24 shrink-0">{slot.vehicle_type}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right shrink-0">
              {booked}/{slot.capacity}名
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">→</span>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">ダッシュボード</h1>
        <span className="text-sm text-gray-400">{todayStr}</span>
      </div>

      {/* 当月サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '今月の予約件数', value: `${monthlyCount}件` },
          { label: '今月の搭乗人数', value: `${monthlyPax}名` },
          { label: '本日の出発枠', value: `${todaySlots.length}枠` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 本日の枠 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">本日 {formatDate(todayStr)}</h2>
            <Link href={`/admin/slots?date=${todayStr}`} className="text-xs text-blue-600 hover:underline">一覧→</Link>
          </div>
          <div className="py-1">
            {todaySlots.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-4 text-center">枠なし</p>
            ) : (
              todaySlots.map(s => <SlotRow key={s.id} slot={s} />)
            )}
          </div>
        </div>

        {/* 翌日の枠 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">翌日 {formatDate(tomorrowStr)}</h2>
            <Link href={`/admin/slots?date=${tomorrowStr}`} className="text-xs text-blue-600 hover:underline">一覧→</Link>
          </div>
          <div className="py-1">
            {tomorrowSlots.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-4 text-center">枠なし</p>
            ) : (
              tomorrowSlots.map(s => <SlotRow key={s.id} slot={s} />)
            )}
          </div>
        </div>
      </div>

      {/* 直近の予約イベント */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">直近のアクティビティ</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">アクティビティなし</p>
          ) : (
            events.map(ev => {
              const payload = ev.payload as Record<string, string> | null
              const isCancel = ev.event_type === 'booking_cancelled'
              return (
                <div key={ev.event_id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isCancel ? 'bg-red-400' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium ${isCancel ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatEventType(ev.event_type)}
                    </span>
                    {payload?.guest_name && (
                      <span className="text-xs text-gray-600 ml-2">{payload.guest_name}</span>
                    )}
                    {payload?.confirmation_code && (
                      <span className="text-xs text-gray-400 ml-1">#{payload.confirmation_code}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-300 shrink-0">
                    {new Date(ev.event_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 出発枠作成ショートカット */}
      <div className="flex gap-3">
        <Link
          href="/admin/slots/new"
          className="px-5 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition"
        >
          + 出発枠を作成
        </Link>
        <Link
          href="/admin/bookings"
          className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
        >
          予約一覧
        </Link>
      </div>
    </div>
  )
}
