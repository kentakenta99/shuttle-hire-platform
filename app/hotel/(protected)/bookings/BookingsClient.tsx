'use client'

import { useState } from 'react'
import Link from 'next/link'

type SlotInfo = { date: string; departure_time: string }

type Booking = {
  id: string
  guest_name: string
  party_size: number
  flight_number: string
  confirmation_code: string
  status: string
  slot_id: string
  shuttle_slots: SlotInfo | SlotInfo[] | null
}

function getSlot(b: Booking): SlotInfo | null {
  if (!b.shuttle_slots) return null
  return Array.isArray(b.shuttle_slots) ? (b.shuttle_slots[0] ?? null) : b.shuttle_slots
}

const STATUS: Record<string, { label: string; color: string }> = {
  confirmed: { label: '予約OK',      color: 'text-green-700 bg-green-50' },
  cancelled: { label: 'キャンセル',  color: 'text-gray-500 bg-gray-100' },
  completed: { label: '搭乗済',      color: 'text-blue-700 bg-blue-50'  },
  arrived:   { label: '到着済',      color: 'text-purple-700 bg-purple-50' },
  no_show:   { label: 'NO SHOW',     color: 'text-red-700 bg-red-50'    },
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth()+1}/${dt.getDate()}（${wd}）`
}

// ──────────────────────────────
// 個人別ビュー（既存と同じ）
// ──────────────────────────────
function ListView({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">予約履歴はありません</p>
  }
  return (
    <div className="space-y-2">
      {bookings.map(b => {
        const st = STATUS[b.status] ?? { label: b.status, color: 'text-gray-500 bg-gray-100' }
        const slot = getSlot(b)
        return (
          <Link
            key={b.id}
            href={`/hotel/bookings/${b.id}`}
            className="block bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{b.guest_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {slot ? `${formatDate(slot.date)} ${slot.departure_time.slice(0,5)}発` : '─'} ·{' '}
                  {b.party_size}名 · {b.flight_number}
                </p>

                <p className="text-xs text-gray-300 mt-0.5 font-mono">{b.confirmation_code}</p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                {st.label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ──────────────────────────────
// 便別ビュー
// ──────────────────────────────
function SlotView({ bookings }: { bookings: Booking[] }) {
  // slot_id でグループ化
  const slotMap = new Map<string, { slot: SlotInfo | null; bookings: Booking[] }>()
  for (const b of bookings) {
    if (!slotMap.has(b.slot_id)) {
      slotMap.set(b.slot_id, { slot: getSlot(b), bookings: [] })
    }
    slotMap.get(b.slot_id)!.bookings.push(b)
  }

  // 出発日時の降順でソート
  const groups = [...slotMap.entries()].sort(([, a], [, b]) => {
    const da = a.slot ? `${a.slot.date}${a.slot.departure_time}` : ''
    const db = b.slot ? `${b.slot.date}${b.slot.departure_time}` : ''
    return db.localeCompare(da)
  })

  if (groups.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">予約履歴はありません</p>
  }

  return (
    <div className="space-y-4">
      {groups.map(([slotId, { slot, bookings: sBookings }]) => {
        const totalPax       = sBookings.reduce((s, b) => s + b.party_size, 0)
        const confirmedCount = sBookings.filter(b => b.status === 'confirmed').length
        const boardedCount   = sBookings.filter(b => b.status === 'completed' || b.status === 'arrived').length
        const cancelledCount = sBookings.filter(b => b.status === 'cancelled').length
        const noShowCount    = sBookings.filter(b => b.status === 'no_show').length
        const activeCount    = sBookings.filter(b => b.status !== 'cancelled').length

        return (
          <div key={slotId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* 便ヘッダー */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {slot ? `${formatDate(slot.date)} ${slot.departure_time.slice(0,5)}発` : '日時不明'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeCount}件 · {totalPax}名
                    {boardedCount > 0 && <span className="ml-1 text-blue-600">搭乗済{boardedCount}</span>}
                    {noShowCount  > 0 && <span className="ml-1 text-red-500">NO SHOW {noShowCount}</span>}
                    {cancelledCount > 0 && <span className="ml-1 text-gray-400">取消{cancelledCount}</span>}
                  </p>
                </div>
                {/* 未搭乗数バッジ */}
                {confirmedCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    待機{confirmedCount}名
                  </span>
                )}
              </div>
            </div>

            {/* 乗客リスト */}
            <div className="divide-y divide-gray-100">
              {sBookings.map(b => {
                const st = STATUS[b.status] ?? { label: b.status, color: 'text-gray-500 bg-gray-100' }
                return (
                  <Link
                    key={b.id}
                    href={`/hotel/bookings/${b.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'} truncate`}>
                        {b.guest_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.party_size}名 · {b.flight_number} ·{' '}
                        <span className="font-mono">{b.confirmation_code}</span>
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────
// メインコンポーネント
// ──────────────────────────────
export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const [view, setView] = useState<'list' | 'slot'>('list')

  return (
    <>
      {/* タブ切り替え */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            view === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          個人別
        </button>
        <button
          type="button"
          onClick={() => setView('slot')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            view === 'slot'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          便別
        </button>
      </div>

      {view === 'list'
        ? <ListView bookings={bookings} />
        : <SlotView bookings={bookings} />
      }
    </>
  )
}
