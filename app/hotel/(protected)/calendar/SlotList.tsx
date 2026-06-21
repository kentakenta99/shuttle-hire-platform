'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { ShuttleSlot } from '@/lib/database.types'

type Props = {
  initialSlots: ShuttleSlot[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:      { label: '受付中',  color: 'text-green-700 bg-green-50' },
  full:      { label: '満席',    color: 'text-red-700 bg-red-50' },
  closed:    { label: '締切済',  color: 'text-gray-500 bg-gray-100' },
  suspended: { label: '運休',    color: 'text-orange-700 bg-orange-50' },
}

function formatTime(t: string) { return t.slice(0, 5) }

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const weekdays = ['日','月','火','水','木','金','土']
  const base = `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）`
  if (diff === 0) return `今日 ${base}`
  if (diff === 1) return `明日 ${base}`
  return base
}

function SeatIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 18 22" width="18" height="22" fill="currentColor"
      className={filled ? 'text-blue-500' : 'text-gray-200'}>
      {/* 背もたれ */}
      <rect x="1" y="0" width="16" height="11" rx="3"/>
      {/* 座面 */}
      <rect x="0" y="12" width="18" height="6" rx="2"/>
      {/* 脚 */}
      <rect x="1"  y="19" width="5" height="3" rx="1"/>
      <rect x="12" y="19" width="5" height="3" rx="1"/>
    </svg>
  )
}

function SeatIcons({ capacity, remaining }: { capacity: number; remaining: number }) {
  const booked = capacity - remaining
  const MAX_ICONS = 10
  if (capacity <= MAX_ICONS) {
    return (
      <div className="flex gap-1 items-end">
        {Array.from({ length: capacity }, (_, i) => (
          <SeatIcon key={i} filled={i < booked} />
        ))}
      </div>
    )
  }
  // 席数が多い場合はアイコン簡略表示
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 items-end">
        {Array.from({ length: Math.min(booked, 5) }, (_, i) => (
          <SeatIcon key={`b${i}`} filled />
        ))}
        {booked > 5 && <span className="text-xs text-blue-500 font-medium ml-0.5">+{booked - 5}</span>}
      </div>
      <span className="text-gray-300 text-xs">/</span>
      <div className="flex gap-0.5 items-end">
        {Array.from({ length: Math.min(remaining, 5) }, (_, i) => (
          <SeatIcon key={`r${i}`} filled={false} />
        ))}
        {remaining > 5 && <span className="text-xs text-gray-500 font-medium ml-0.5">+{remaining - 5}</span>}
      </div>
    </div>
  )
}

function groupByDate(slots: ShuttleSlot[]) {
  const map = new Map<string, ShuttleSlot[]>()
  for (const s of slots) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date)!.push(s)
  }
  return map
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

  if (slots.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-4xl mb-3">🚗</p>
        <p className="text-sm">本日以降の出発枠はありません</p>
        <p className="text-xs mt-1">東京エムケイ 配車センター：03-XXXX-XXXX</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([date, dateSlots]) => (
        <div key={date}>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">{formatDateLabel(date)}</h2>
          <div className="space-y-2">
            {dateSlots.map(slot => {
              const st = STATUS_LABELS[slot.status] ?? { label: slot.status, color: 'text-gray-500 bg-gray-100' }
              const isPastCutoff = new Date(slot.cutoff_at) <= new Date()
              const isBookable = slot.status === 'open' && slot.remaining_seats > 0 && !isPastCutoff
              const seatsColor = slot.remaining_seats >= 3 ? 'text-green-600' :
                                 slot.remaining_seats >= 1 ? 'text-yellow-600' : 'text-red-500'

              return (
                <div key={slot.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-900 tabular-nums">
                        {formatTime(slot.departure_time)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                          <span className="text-xs text-gray-500">{slot.vehicle_type}</span>
                        </div>
                        {slot.status === 'open' && isPastCutoff && (
                          <p className="text-xs mt-0.5 text-gray-500">締切済</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-500">¥{slot.price_per_seat_yen.toLocaleString()}/席</span>
                      {isBookable ? (
                        <Link
                          href={`/hotel/book/${slot.id}`}
                          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          予約する
                        </Link>
                      ) : slot.status === 'full' ? (
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">通常ハイヤーへ</span>
                          <span className="text-xs text-blue-600 font-medium">03-XXXX-XXXX</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">─</span>
                      )}
                    </div>
                  </div>

                  {/* 椅子アイコンで残席表示 */}
                  {slot.status !== 'suspended' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                      <SeatIcons capacity={slot.capacity} remaining={slot.remaining_seats} />
                      <span className={`text-xs font-medium ${seatsColor}`}>
                        残{slot.remaining_seats}席 / {slot.capacity}席
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
