'use client'

import { useState } from 'react'
import Link from 'next/link'

type Booking = {
  id: string
  confirmation_code: string
  guest_name: string
  party_size: number
  luggage_count: number
  flight_number: string
  status: string
  hotel_id: string
  slot_id: string
}

type SlotInfo = {
  id: string
  date: string
  departure_time: string
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: '予約OK',     cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-red-100 text-red-700' },
  completed: { label: '搭乗済',     cls: 'bg-blue-100 text-blue-700' },
  arrived:   { label: '到着済',     cls: 'bg-purple-100 text-purple-700' },
  no_show:   { label: 'NO SHOW',    cls: 'bg-orange-100 text-orange-700' },
}

// ──────────────────────────────
// 乗客軸ビュー（既存テーブル）
// ──────────────────────────────
function TableView({ bookings, slotMap, hotelMap }: {
  bookings: Booking[]
  slotMap: Record<string, SlotInfo>
  hotelMap: Record<string, string>
}) {
  if (bookings.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">該当する予約がありません</p>
  }
  return (
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
          {bookings.map(b => {
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
  )
}

// ──────────────────────────────
// 便軸ビュー
// ──────────────────────────────
function SlotView({ bookings, slotMap, hotelMap }: {
  bookings: Booking[]
  slotMap: Record<string, SlotInfo>
  hotelMap: Record<string, string>
}) {
  const groups = new Map<string, { slot: SlotInfo | undefined; bookings: Booking[]; hotelIds: Set<string> }>()
  for (const b of bookings) {
    if (!groups.has(b.slot_id)) {
      groups.set(b.slot_id, { slot: slotMap[b.slot_id], bookings: [], hotelIds: new Set() })
    }
    const g = groups.get(b.slot_id)!
    g.bookings.push(b)
    g.hotelIds.add(b.hotel_id)
  }

  // 出発日時の降順
  const sorted = [...groups.entries()].sort(([, a], [, b]) => {
    const da = a.slot ? `${a.slot.date}${a.slot.departure_time}` : ''
    const db = b.slot ? `${b.slot.date}${b.slot.departure_time}` : ''
    return db.localeCompare(da)
  })

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">該当する予約がありません</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {sorted.map(([slotId, { slot, bookings: sBookings, hotelIds }]) => {
        const totalPax     = sBookings.reduce((s, b) => s + b.party_size, 0)
        const totalLuggage = sBookings.reduce((s, b) => s + b.luggage_count, 0)
        const confirmedCount = sBookings.filter(b => b.status === 'confirmed').length
        const completedCount = sBookings.filter(b => b.status === 'completed').length
        const arrivedCount   = sBookings.filter(b => b.status === 'arrived').length
        const noShowCount    = sBookings.filter(b => b.status === 'no_show').length
        const cancelledCount = sBookings.filter(b => b.status === 'cancelled').length
        const hotelNames     = [...hotelIds].map(hid => hotelMap[hid] ?? '─').join('・')

        return (
          <div key={slotId}>
            {/* 便ヘッダー */}
            <div className="px-4 py-3 bg-gray-50 flex items-start gap-4 flex-wrap">
              <div className="shrink-0 min-w-[140px]">
                <p className="text-sm font-bold text-gray-900 font-mono">
                  {slot ? `${slot.date} ${slot.departure_time.slice(0, 5)}発` : '日時不明'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{hotelNames}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-500 font-medium">{sBookings.length}件 · {totalPax}名 · 荷物{totalLuggage}個</span>
                {confirmedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">予約OK {confirmedCount}</span>
                )}
                {completedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">搭乗済 {completedCount}</span>
                )}
                {arrivedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">到着済 {arrivedCount}</span>
                )}
                {noShowCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">NO SHOW {noShowCount}</span>
                )}
                {cancelledCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">取消 {cancelledCount}</span>
                )}
              </div>
            </div>

            {/* 乗客テーブル */}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {sBookings.map(b => {
                  const s = STATUS_LABEL[b.status] ?? { label: b.status, cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition">
                      <td className="pl-8 pr-4 py-2.5 w-32">
                        <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {b.confirmation_code}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        <Link href={`/admin/bookings/${b.id}`} className="hover:text-blue-600 transition">
                          {b.guest_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{hotelMap[b.hotel_id] ?? '─'}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-600">{b.party_size}名</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-600">{b.luggage_count}個</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.flight_number}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────
// メインコンポーネント
// ──────────────────────────────
export default function AdminBookingsClient({ bookings, slotMap, hotelMap }: {
  bookings: Booking[]
  slotMap: Record<string, SlotInfo>
  hotelMap: Record<string, string>
}) {
  const [view, setView] = useState<'list' | 'slot'>('list')

  return (
    <>
      {/* タブ切り替え */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          乗客軸
        </button>
        <button
          type="button"
          onClick={() => setView('slot')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            view === 'slot' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          便軸
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
          {bookings.length} 件
        </div>
        {view === 'list'
          ? <TableView bookings={bookings} slotMap={slotMap} hotelMap={hotelMap} />
          : <SlotView bookings={bookings} slotMap={slotMap} hotelMap={hotelMap} />
        }
      </div>
    </>
  )
}
