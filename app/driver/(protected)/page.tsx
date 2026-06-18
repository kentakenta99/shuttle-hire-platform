import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RefreshButton from '@/app/components/RefreshButton'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:      { label: '受付中', cls: 'text-green-400' },
  full:      { label: '満席',   cls: 'text-orange-400' },
  closed:    { label: 'クローズ', cls: 'text-gray-400' },
  suspended: { label: '運休',   cls: 'text-red-400' },
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function jstDateStr(d: Date) {
  const jst = new Date(d.getTime() + 9 * 3600_000)
  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`
}

function formatDateShort(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth() + 1}/${dt.getDate()}（${wd}）`
}

export default async function DriverHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: driver } = await supabase
    .from('driver_users')
    .select('id, display_name, employee_code')
    .eq('user_id', user!.id)
    .single()

  if (!driver) return null

  // 本日〜3日後のアサインを取得
  const now = new Date()
  const todayStr = jstDateStr(now)
  const endStr = jstDateStr(new Date(now.getTime() + 3 * 86_400_000))

  const { data: assignments } = await supabase
    .from('driver_assignments')
    .select('slot_id, employee_code')
    .eq('driver_id', driver.id)

  const slotIds = (assignments ?? []).map(a => a.slot_id)

  const { data: slots } = slotIds.length > 0
    ? await supabase
        .from('shuttle_slots')
        .select('id, date, departure_time, capacity, remaining_seats, status, vehicle_type')
        .in('id', slotIds)
        .gte('date', todayStr)
        .lte('date', endStr)
        .order('date')
        .order('departure_time')
    : { data: [] }

  // 各スロットの予約ステータス集計（no_show含む）
  const { data: bookingCounts } = slotIds.length > 0
    ? await supabase
        .from('bookings')
        .select('slot_id, status')
        .in('slot_id', slotIds)
        .in('status', ['confirmed', 'completed', 'arrived', 'no_show'])
    : { data: [] }

  const completedMap: Record<string, { confirmed: number; completed: number; arrived: number; no_show: number }> = {}
  for (const b of bookingCounts ?? []) {
    if (!completedMap[b.slot_id]) completedMap[b.slot_id] = { confirmed: 0, completed: 0, arrived: 0, no_show: 0 }
    if (b.status === 'confirmed') completedMap[b.slot_id]!.confirmed++
    if (b.status === 'completed') completedMap[b.slot_id]!.completed++
    if (b.status === 'arrived')   completedMap[b.slot_id]!.arrived++
    if (b.status === 'no_show')   completedMap[b.slot_id]!.no_show++
  }

  // 乗務完了 = confirmed も completed も残っていない（全員が arrived/no_show/cancelled）
  function isSlotDone(slotId: string): boolean {
    const c = completedMap[slotId]
    if (!c) return false
    const active = c.confirmed + c.completed + c.arrived + c.no_show
    return active > 0 && c.confirmed === 0 && c.completed === 0
  }

  const todaySlots = (slots ?? []).filter(s => s.date === todayStr && !isSlotDone(s.id))
  const todayDoneCount = (slots ?? []).filter(s => s.date === todayStr && isSlotDone(s.id)).length
  const futureSlots = (slots ?? []).filter(s => s.date !== todayStr)

  type SlotRow = { id: string; date: string; departure_time: string; capacity: number; remaining_seats: number; status: string; vehicle_type: string }
  function SlotCard({ slot }: { slot: SlotRow }) {
    const counts = completedMap[slot.id] ?? { confirmed: 0, completed: 0, arrived: 0 }
    const total = counts.confirmed + counts.completed + counts.arrived
    const doneCount = counts.completed + counts.arrived
    const allArrived = total > 0 && counts.arrived === total
    const allBoarded = total > 0 && doneCount === total
    const s = STATUS_LABEL[slot.status] ?? { label: slot.status, cls: 'text-gray-400' }

    return (
      <Link
        href={`/driver/slots/${slot.id}`}
        className="block bg-gray-800 rounded-2xl border border-gray-700 hover:border-blue-500 transition p-4 active:scale-95"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-2xl font-bold font-mono text-white">
              {slot.departure_time.slice(0, 5)}
              <span className="text-sm text-gray-400 ml-1">発</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{slot.vehicle_type}</p>
          </div>
          <span className={`text-xs font-medium ${s.cls}`}>{s.label}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                allArrived ? 'bg-purple-500' : allBoarded ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: total > 0 ? `${Math.round(doneCount / total * 100)}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {allArrived ? `到着済 ${total}/${total}` : `搭乗 ${doneCount}/${total}`}件
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs mb-1">{todayStr}</p>
          <h1 className="text-xl font-bold text-white">本日の担当便</h1>
        </div>
        <RefreshButton dark />
      </div>

      {todaySlots.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-10 text-center">
          {todayDoneCount > 0 ? (
            <>
              <p className="text-2xl mb-2">✅</p>
              <p className="text-white text-sm font-medium">本日の乗務はすべて完了しました</p>
              <p className="text-gray-500 text-xs mt-1">{todayDoneCount}便 · お疲れさまでした</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">本日の担当便はありません</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {todaySlots.map(s => <SlotCard key={s.id} slot={s} />)}
        </div>
      )}

      {futureSlots.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400">今後の担当便</h2>
          {futureSlots.map(s => (
            <Link
              key={s.id}
              href={`/driver/slots/${s.id}`}
              className="flex items-center gap-4 bg-gray-800 rounded-xl border border-gray-700 px-4 py-3 hover:border-gray-500 transition"
            >
              <div className="text-center w-16 shrink-0">
                <p className="text-xs text-gray-400">{formatDateShort(s.date)}</p>
                <p className="text-sm font-bold font-mono text-white">{s.departure_time.slice(0, 5)}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">{s.vehicle_type}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  定員 {s.capacity}名
                </p>
              </div>
              <span className="text-gray-600 text-sm">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
