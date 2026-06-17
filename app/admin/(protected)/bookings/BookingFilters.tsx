'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Hotel = { id: string; name: string }

export default function BookingFilters({ hotels }: { hotels: Hotel[] }) {
  const router = useRouter()
  const sp = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/admin/bookings?${params.toString()}`)
  }

  function pad2(n: number) { return String(n).padStart(2, '0') }
  function jstDateStr(d: Date) {
    const jst = new Date(d.getTime() + 9 * 3600_000)
    return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`
  }

  const dates = Array.from({ length: 30 }, (_, i) =>
    jstDateStr(new Date(Date.now() + (i - 7) * 86_400_000))
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 shrink-0">出発日:</label>
        <select
          defaultValue={sp.get('date') ?? ''}
          onChange={e => update('date', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-800"
        >
          <option value="">全期間</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 shrink-0">ホテル:</label>
        <select
          defaultValue={sp.get('hotel') ?? ''}
          onChange={e => update('hotel', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-800"
        >
          <option value="">全ホテル</option>
          {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 shrink-0">ステータス:</label>
        <select
          defaultValue={sp.get('status') ?? ''}
          onChange={e => update('status', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-800"
        >
          <option value="">全ステータス</option>
          <option value="confirmed">確定</option>
          <option value="cancelled">キャンセル</option>
          <option value="completed">完了</option>
        </select>
      </div>
    </div>
  )
}
