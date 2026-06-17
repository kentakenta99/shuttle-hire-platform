import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BoardingRow, QRScanInput } from './BoardingPanel'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth() + 1}月${dt.getDate()}日（${wd}）`
}

const STATUS_BADGE: Record<string, string> = {
  open:      'bg-green-900 text-green-400',
  full:      'bg-orange-900 text-orange-400',
  closed:    'bg-gray-700 text-gray-400',
  suspended: 'bg-red-900 text-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  open: '受付中', full: '満席', closed: 'クローズ', suspended: '運休',
}

export default async function DriverSlotPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [slotRes, bookingsRes] = await Promise.all([
    supabase.from('shuttle_slots').select('*').eq('id', id).single(),
    supabase
      .from('bookings')
      .select('id, confirmation_code, guest_name, party_size, luggage_count, flight_number, notes, status')
      .eq('slot_id', id)
      .neq('status', 'cancelled')
      .order('created_at'),
  ])

  if (!slotRes.data) notFound()
  const slot = slotRes.data
  const bookings = bookingsRes.data ?? []

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const boardedCount = bookings.filter(b => b.status === 'completed').length
  const totalPax = bookings.reduce((a, b) => a + b.party_size, 0)
  const boardedPax = bookings.filter(b => b.status === 'completed').reduce((a, b) => a + b.party_size, 0)

  const statusBadge = STATUS_BADGE[slot.status] ?? 'bg-gray-700 text-gray-400'
  const statusLabel = STATUS_LABEL[slot.status] ?? slot.status

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/driver" className="text-sm text-gray-400 hover:text-white transition">← 担当便</Link>
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
            <span>乗車確認済</span>
            <span className="font-medium text-white">{boardedCount}/{bookings.length}件 ({boardedPax}/{totalPax}名)</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                boardedCount === bookings.length && bookings.length > 0
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: bookings.length > 0 ? `${Math.round(boardedCount / bookings.length * 100)}%` : '0%' }}
            />
          </div>
          {boardedCount === bookings.length && bookings.length > 0 && (
            <p className="text-xs text-green-400 text-center">全員乗車確認完了！</p>
          )}
        </div>
      </div>

      {/* QRスキャン入力 */}
      <QRScanInput slotId={id} />

      {/* 乗車リスト */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">
            乗車リスト
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {bookings.length}件 / {totalPax}名
            </span>
          </h2>
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">予約がありません</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {/* 未乗車を先に、乗車済を後に */}
            {[
              ...bookings.filter(b => b.status === 'confirmed'),
              ...bookings.filter(b => b.status === 'completed'),
            ].map(b => (
              <BoardingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
