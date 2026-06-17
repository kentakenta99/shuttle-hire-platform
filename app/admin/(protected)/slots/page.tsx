import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ date?: string }> }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:      { label: '受付中',   cls: 'bg-green-100 text-green-700' },
  full:      { label: '満席',     cls: 'bg-orange-100 text-orange-700' },
  closed:    { label: 'クローズ', cls: 'bg-gray-100 text-gray-600' },
  suspended: { label: '運休',     cls: 'bg-red-100 text-red-700' },
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function jstDateStr(d: Date) {
  const jst = new Date(d.getTime() + 9 * 3600_000)
  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`
}
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86_400_000) }

function formatDateHeader(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日（${wd}）`
}

export default async function AdminSlotsPage({ searchParams }: Props) {
  const { date } = await searchParams
  const supabase = await createClient()

  const baseDate = date ? new Date(date + 'T00:00:00+09:00') : new Date()
  const weekStart = jstDateStr(baseDate)
  const weekEnd = jstDateStr(addDays(new Date(weekStart + 'T00:00:00+09:00'), 13))

  const prevWeekStart = jstDateStr(addDays(new Date(weekStart + 'T00:00:00+09:00'), -14))
  const nextWeekStart = jstDateStr(addDays(new Date(weekStart + 'T00:00:00+09:00'), 14))

  const { data: slots } = await supabase
    .from('shuttle_slots')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date')
    .order('departure_time')

  // 日付ごとにグループ化
  const byDate: Record<string, typeof slots> = {}
  for (const slot of slots ?? []) {
    byDate[slot.date] = byDate[slot.date] ?? []
    byDate[slot.date]!.push(slot)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">出発枠一覧</h1>
        <Link
          href="/admin/slots/new"
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition"
        >
          + 枠を作成
        </Link>
      </div>

      {/* 週ナビゲーション */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <Link
          href={`/admin/slots?date=${prevWeekStart}`}
          className="text-sm text-gray-500 hover:text-gray-900 transition px-2 py-1 rounded hover:bg-gray-100"
        >
          ← 前の2週間
        </Link>
        <span className="flex-1 text-center text-sm text-gray-700 font-medium">
          {weekStart} 〜 {weekEnd}
        </span>
        <Link
          href={`/admin/slots?date=${nextWeekStart}`}
          className="text-sm text-gray-500 hover:text-gray-900 transition px-2 py-1 rounded hover:bg-gray-100"
        >
          次の2週間 →
        </Link>
      </div>

      {Object.entries(byDate).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-gray-400 text-sm">この期間に出発枠がありません</p>
          <Link href="/admin/slots/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            枠を作成する →
          </Link>
        </div>
      ) : (
        Object.entries(byDate).map(([date, daySlots]) => (
          <div key={date} className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <h2 className="text-sm font-semibold text-gray-700">{formatDateHeader(date)}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {daySlots!.map(slot => {
                const booked = slot.capacity - slot.remaining_seats
                const pct = slot.capacity > 0 ? Math.round((booked / slot.capacity) * 100) : 0
                const s = STATUS_LABEL[slot.status] ?? { label: slot.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <Link
                    key={slot.id}
                    href={`/admin/slots/${slot.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition group"
                  >
                    <span className="text-sm font-mono font-medium text-gray-800 w-14 shrink-0">
                      {slot.departure_time.slice(0, 5)}
                    </span>
                    <span className="text-xs text-gray-400 w-28 shrink-0">{slot.vehicle_type}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-20 text-right shrink-0">
                        {booked}/{slot.capacity}名 ({pct}%)
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                    <span className="text-xs text-gray-300 w-16 text-right shrink-0">
                      ¥{slot.price_per_seat_yen.toLocaleString()}/席
                    </span>
                    <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition text-sm">→</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
