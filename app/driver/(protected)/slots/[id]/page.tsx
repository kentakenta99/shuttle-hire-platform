import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BoardingRow, QRScanInput, ArrivalButton } from './BoardingPanel'
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
      .select('id, confirmation_code, guest_name, party_size, luggage_count, flight_number, notes, status')
      .eq('slot_id', id)
      .neq('status', 'cancelled')
      .order('created_at'),
  ])

  if (!slotRes.data) notFound()
  const slot = slotRes.data
  const bookings = bookingsRes.data ?? []

  const boardedCount  = bookings.filter(b => b.status === 'completed').length
  const arrivedCount  = bookings.filter(b => b.status === 'arrived').length
  const totalPax      = bookings.reduce((a, b) => a + b.party_size, 0)
  const totalLuggage  = bookings.reduce((a, b) => a + b.luggage_count, 0)
  const boardedPax    = bookings.filter(b => b.status === 'completed').reduce((a, b) => a + b.party_size, 0)
  const allBoarded    = bookings.length > 0 && bookings.every(b => b.status !== 'confirmed')
  const allArrived    = bookings.length > 0 && bookings.every(b => b.status === 'arrived')

  // フライト情報を取得（APIキー未設定時は全件 null）
  const uniqueFlights = [...new Set(bookings.map(b => b.flight_number).filter(Boolean))]
  const flightResults = await Promise.all(uniqueFlights.map(fn => fetchFlightInfo(fn, slot.date)))
  const flightMap: Record<string, FlightInfo | null> = {}
  uniqueFlights.forEach((fn, i) => { flightMap[fn] = flightResults[i] })

  const statusBadge = SLOT_BADGE[slot.status] ?? 'bg-gray-700 text-gray-400'
  const statusLabel = SLOT_LABEL[slot.status] ?? slot.status

  return (
    <div className="space-y-4">
      {/* ナビゲーションバー */}
      <div className="flex items-center gap-2">
        <Link
          href="/driver"
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 flex-1"
        >
          <span className="text-lg leading-none">←</span>
          <span className="font-medium">担当便一覧</span>
        </Link>
        <RefreshButton dark />
      </div>

      {/* 便情報ヘッダー */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
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
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allArrived ? 'bg-purple-500' : allBoarded ? 'bg-green-500' : 'bg-blue-500'
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
        </div>

        {/* 到着確認ボタン（全員搭乗済かつ未到着確認時に表示） */}
        {isAssigned && allBoarded && !allArrived && (
          <ArrivalButton slotId={id} />
        )}
      </div>

      {/* 乗客名簿 */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {/* ヘッダー：乗客数・荷物数を目立たせる */}
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">乗客名簿</h2>
            <p className="text-xs text-gray-500 mt-0.5">{bookings.length}件 — タップで搭乗確認</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white leading-none">{totalPax}</p>
              <p className="text-xs text-gray-400 mt-0.5">名</p>
            </div>
            <div className="w-px h-10 bg-gray-700" />
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
            ].map(b => (
              <BoardingRow
                key={b.id}
                booking={b}
                canBoard={isAssigned}
                flightInfo={flightMap[b.flight_number] ?? null}
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
