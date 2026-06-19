import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BoardingRow, QRScanInput, TripProgressButton } from './BoardingPanel'
import RefreshButton from '@/app/components/RefreshButton'
import { fetchFlightInfo, type FlightInfo } from '@/lib/flight'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth() + 1}月${dt.getDate()}日（${wd}）`
}

const SLOT_BADGE: Record<string, string> = {
  open:      'bg-green-900 text-green-400',
  full:      'bg-orange-900 text-orange-400',
  closed:    'bg-gray-700 text-gray-400',
  suspended: 'bg-red-900 text-red-400',
}
const SLOT_LABEL: Record<string, string> = {
  open: '受付中', full: '満席', closed: 'クローズ', suspended: '運休',
}

export default async function DriverSlotPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // ドライバー認証確認（通常クライアント）
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/driver/login')

  const { data: driverUser } = await supabase
    .from('driver_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!driverUser) redirect('/driver/login')

  // RLSをバイパスしてデータ取得
  const adminDb = createAdminClient()

  // 担当便確認
  const { data: assignment } = await adminDb
    .from('driver_assignments')
    .select('id')
    .eq('slot_id', id)
    .eq('driver_id', driverUser.id)
    .maybeSingle()

  // 未アサインでも閲覧は許可（管理者がアサイン前に確認するケース対応）
  const isAssigned = !!assignment

  const [slotRes, bookingsRes] = await Promise.all([
    adminDb.from('shuttle_slots').select('*').eq('id', id).single(),
    adminDb
      .from('bookings')
      .select('id, confirmation_code, guest_name, party_size, luggage_count, flight_number, notes, status, hotel_id')
      .eq('slot_id', id)
      .neq('status', 'cancelled')
      .order('created_at'),
  ])

  if (!slotRes.data) notFound()
  const slot = slotRes.data
  const bookings = bookingsRes.data ?? []

  // ホテルの電話番号を取得（shuttle_slotsにhotel_idはないのでbooking経由）
  let hotelPhone: string | null = null
  if (bookings.length > 0) {
    const firstHotelId = (bookings[0] as { hotel_id?: string | null }).hotel_id
    if (firstHotelId) {
      const { data: hotel } = await adminDb
        .from('hotels')
        .select('contact_phone')
        .eq('id', firstHotelId)
        .single()
      hotelPhone = hotel?.contact_phone ?? null
    }
  }

  const boardedCount    = bookings.filter(b => b.status === 'completed').length
  const arrivedCount    = bookings.filter(b => b.status === 'arrived').length
  const confirmedCount  = bookings.filter(b => b.status === 'confirmed').length
  const totalPax        = bookings.reduce((a, b) => a + b.party_size, 0)
  const totalLuggage    = bookings.reduce((a, b) => a + b.luggage_count, 0)
  const boardedPax      = bookings.filter(b => b.status === 'completed').reduce((a, b) => a + b.party_size, 0)
  const allBoarded      = bookings.length > 0 && bookings.every(b => b.status !== 'confirmed')
  const allArrived      = bookings.length > 0 && bookings.every(b => b.status === 'arrived')
  // 到着確認済み後に新規予約が入った場合など、混在状態の検出
  const hasMixedState   = arrivedCount > 0 && confirmedCount > 0

  // フライト情報を取得（APIキー未設定時は全件 null）
  const uniqueFlights = [...new Set(bookings.map(b => b.flight_number).filter(Boolean))]
  const flightResults = await Promise.all(uniqueFlights.map(fn => fetchFlightInfo(fn, slot.date)))
  const flightMap: Record<string, FlightInfo | null> = {}
  uniqueFlights.forEach((fn, i) => { flightMap[fn] = flightResults[i] })

  // ターミナル別グループ化 → 最早便の出発順にソート
  type TerminalGroup = { terminal: string; earliestDep: string | null; pax: number }
  const terminalMap = new Map<string, TerminalGroup>()
  for (const b of bookings) {
    const fi = flightMap[b.flight_number]
    const t = fi?.terminal
    if (!t) continue
    const dep = fi?.scheduledDeparture ?? null
    if (!terminalMap.has(t)) {
      terminalMap.set(t, { terminal: t, earliestDep: dep, pax: b.party_size })
    } else {
      const g = terminalMap.get(t)!
      g.pax += b.party_size
      if (dep && (!g.earliestDep || dep < g.earliestDep)) g.earliestDep = dep
    }
  }
  const terminalRoute = [...terminalMap.values()].sort((a, b) => {
    if (!a.earliestDep) return 1
    if (!b.earliestDep) return -1
    return a.earliestDep < b.earliestDep ? -1 : 1
  })

  const statusBadge = SLOT_BADGE[slot.status] ?? 'bg-gray-700 text-gray-400'
  const statusLabel = SLOT_LABEL[slot.status] ?? slot.status

  return (
    <div className="space-y-4">
      {/* ナビゲーションバー */}
      <div className="flex items-center gap-2">
        <Link
          href="/driver"
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex-1"
        >
          <span className="text-lg leading-none">←</span>
          <span className="font-medium">担当便一覧</span>
        </Link>
        <RefreshButton dark />
      </div>

      {/* 便情報ヘッダー */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">{formatDate(slot.date)}</p>
            <p className="text-4xl font-bold font-mono text-white mt-1">
              {slot.departure_time.slice(0, 5)}
              <span className="text-lg text-gray-400 ml-1">発</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">{slot.vehicle_type}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge}`}>
            {statusLabel}
          </span>
        </div>

        {/* 乗車進捗バー */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>搭乗確認済</span>
            <span className="font-medium text-white">
              {boardedCount + arrivedCount}/{bookings.length}件 ({boardedPax}/{totalPax}名)
            </span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allArrived ? 'bg-purple-500' : allBoarded ? 'bg-green-500' : 'bg-[#C9A227]'
              }`}
              style={{
                width: bookings.length > 0
                  ? `${Math.round((boardedCount + arrivedCount) / bookings.length * 100)}%`
                  : '0%'
              }}
            />
          </div>
          {allArrived && <p className="text-xs text-purple-400 text-center">空港到着確認完了！</p>}
          {allBoarded && !allArrived && <p className="text-xs text-green-400 text-center">全員搭乗済 — 到着確認をしてください</p>}
          {hasMixedState && (
            <div className="mt-1 bg-amber-900/40 border border-amber-700/60 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-400">⚠ {confirmedCount}名が未搭乗のままです</p>
              <p className="text-xs text-amber-500/80 mt-0.5">到着確認後に新規予約が追加された可能性があります。管理者にご確認ください。</p>
            </div>
          )}
        </div>

        {/* 出発 → 到着 昇華ボタン（全員搭乗済 or 未到着確認時に表示） */}
        {isAssigned && (allBoarded || slot.departed_at) && (
          <TripProgressButton
            slotId={id}
            departedAt={slot.departed_at ?? null}
            arrivedAt={slot.arrived_at ?? null}
          />
        )}
      </div>

      {/* ターミナル順序（APIでターミナル情報が取得できた場合のみ表示） */}
      {terminalRoute.length >= 2 && (
        <div className="bg-zinc-900 rounded-2xl border border-[#C9A227]/30 p-4">
          <p className="text-xs font-semibold text-[#C9A227] mb-3">🛫 ターミナル停車順（自動）</p>
          <div className="flex items-center gap-2 flex-wrap">
            {terminalRoute.map((g, i) => (
              <div key={g.terminal} className="flex items-center gap-2">
                <div className="flex flex-col items-center bg-blue-900/60 border border-[#C9A227]/40 rounded-xl px-4 py-2 min-w-[72px] text-center">
                  <span className="text-xs text-[#C9A227] font-medium">第{i + 1}停車</span>
                  <span className="text-2xl font-black text-white leading-tight">T{g.terminal}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{g.pax}名</span>
                </div>
                {i < terminalRoute.length - 1 && (
                  <span className="text-gray-500 text-xl">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">最早出発便の順に自動ソートしています</p>
        </div>
      )}
      {terminalRoute.length === 1 && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-3 flex items-center gap-3">
          <span className="text-[#C9A227] text-lg">🛫</span>
          <div>
            <p className="text-xs text-gray-400">全員同じターミナル</p>
            <p className="text-lg font-bold text-white">第{terminalRoute[0].terminal}ターミナル</p>
          </div>
        </div>
      )}

      {/* 乗客名簿 */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        {/* ヘッダー：乗客数・荷物数を目立たせる */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">乗客名簿</h2>
            <p className="text-xs text-gray-500 mt-0.5">{bookings.length}件 — タップで搭乗確認</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white leading-none">{totalPax}</p>
              <p className="text-xs text-gray-400 mt-0.5">名</p>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400 leading-none">{totalLuggage}</p>
              <p className="text-xs text-gray-400 mt-0.5">個</p>
            </div>
          </div>
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">予約がありません</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {[
              ...bookings.filter(b => b.status === 'confirmed'),
              ...bookings.filter(b => b.status === 'completed'),
              ...bookings.filter(b => b.status === 'arrived'),
              ...bookings.filter(b => b.status === 'no_show'),
            ].map(b => (
              <BoardingRow
                key={b.id}
                booking={b}
                canBoard={isAssigned}
                flightInfo={flightMap[b.flight_number] ?? null}
                hotelPhone={hotelPhone}
                slotDate={slot.date}
                slotTime={slot.departure_time}
              />
            ))}
          </div>
        )}
      </div>

      {/* QRスキャン入力（名簿確認後に使用） */}
      {isAssigned && <QRScanInput slotId={id} />}
      {!isAssigned && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-2xl px-4 py-3 text-xs text-yellow-400">
          この便はまだアサインされていません。管理者にご確認ください。
        </div>
      )}
    </div>
  )
}
