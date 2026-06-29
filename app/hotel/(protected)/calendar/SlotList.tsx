'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { ShuttleSlot } from '@/lib/database.types'

type Props = {
  initialSlots: ShuttleSlot[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:      { label: '空きあり', color: 'text-green-700 bg-green-50 border border-green-200' },
  full:      { label: '満席',     color: 'text-red-700 bg-red-50 border border-red-200' },
  closed:    { label: '締切済',   color: 'text-gray-500 bg-gray-100 border border-gray-200' },
  suspended: { label: '運休',     color: 'text-orange-700 bg-orange-50 border border-orange-200' },
}

const MK_BLUE = '#1a3a6b'

function formatTime(t: string) { return t.slice(0, 5) }

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  if (diff === 0) return { prefix: '今日', date: `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`, isToday: true, isTomorrow: false }
  if (diff === 1) return { prefix: '明日', date: `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`, isToday: false, isTomorrow: true }
  return { prefix: '', date: `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`, isToday: false, isTomorrow: false }
}

function groupByDate(slots: ShuttleSlot[]) {
  const map = new Map<string, ShuttleSlot[]>()
  for (const s of slots) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date)!.push(s)
  }
  return map
}

function SlotCard({ slot }: { slot: ShuttleSlot }) {
  const st = STATUS_LABELS[slot.status] ?? { label: slot.status, color: 'text-gray-500 bg-gray-100' }
  const isPastCutoff = new Date(slot.cutoff_at) <= new Date()
  const isBookable = slot.status === 'open' && slot.remaining_seats > 0 && !isPastCutoff
  const booked = slot.capacity - slot.remaining_seats

  const statusLabel = slot.status === 'open' && slot.remaining_seats <= 2 && slot.remaining_seats > 0
    ? `残${slot.remaining_seats}席`
    : slot.status === 'open' && isPastCutoff
    ? '締切済'
    : st.label

  const statusColor = slot.status === 'open' && slot.remaining_seats <= 2 && slot.remaining_seats > 0
    ? 'text-amber-700 bg-amber-50 border border-amber-200'
    : st.color

  const cardBorder = slot.status === 'full'
    ? 'border-red-200 bg-red-50/20'
    : slot.status === 'open' && slot.remaining_seats <= 2 && slot.remaining_seats > 0
    ? 'border-amber-300'
    : slot.status === 'suspended'
    ? 'border-gray-200 opacity-60'
    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all'

  return (
    <div className={`bg-white rounded-2xl border-2 p-4 ${cardBorder}`}>
      <div className="text-2xl font-extrabold mb-2" style={{ color: MK_BLUE }}>
        {formatTime(slot.departure_time)}
      </div>
      <div className="mb-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        {booked}/{slot.capacity}名
        {booked > 0 && <span className="ml-1">· {booked}件</span>}
      </div>
      {isBookable ? (
        <Link
          href={`/hotel/book/${slot.id}`}
          className="block w-full text-center text-white text-xs font-bold py-2 rounded-lg transition"
          style={{ background: MK_BLUE }}
        >
          予約する
        </Link>
      ) : (
        <div className="block w-full text-center text-xs text-gray-400 py-2">─</div>
      )}
    </div>
  )
}

export default function SlotList({ initialSlots }: Props) {
  const [slots, setSlots] = useState<ShuttleSlot[]>(initialSlots)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('shuttle_slots_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shuttle_slots' },
        (payload) => {
          setSlots(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as ShuttleSlot].sort((a, b) =>
                a.date.localeCompare(b.date) || a.departure_time.localeCompare(b.departure_time)
              )
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(s => s.id === (payload.new as ShuttleSlot).id ? payload.new as ShuttleSlot : s)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(s => s.id !== (payload.old as ShuttleSlot).id)
            }
            return prev
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const grouped = groupByDate(slots)
  const dates = Array.from(grouped.keys())

  if (slots.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-4xl mb-3">🚗</p>
        <p className="text-sm">本日以降の出発枠はありません</p>
        <p className="text-xs mt-1 text-gray-400">
          {process.env.NEXT_PUBLIC_DISPATCH_PHONE ?? '東京エムケイ 配車センター'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-3 pb-4" style={{ minWidth: `${dates.length * 200}px` }}>
        {dates.map(date => {
          const dateSlots = grouped.get(date)!
          const { prefix, date: dateDisplay, isToday } = formatDateLabel(date)

          return (
            <div key={date} className="flex-shrink-0" style={{ width: '190px' }}>
              {/* 日付ヘッダー */}
              <div className={`text-center mb-3 pb-2 border-b-2 ${isToday ? 'border-blue-700' : 'border-gray-200'}`}>
                {prefix && (
                  <div className={`text-xs font-bold mb-0.5 ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>
                    {prefix}
                  </div>
                )}
                <div className={`font-bold ${isToday ? 'text-lg' : 'text-base text-gray-700'}`}
                  style={isToday ? { color: MK_BLUE } : {}}>
                  {dateDisplay}
                </div>
              </div>

              {/* スロットカード列 */}
              <div className="flex flex-col gap-2">
                {dateSlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
