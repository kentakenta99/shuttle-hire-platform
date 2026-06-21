'use client'

import { useState, useTransition } from 'react'
import { generateMonthlyInvoice } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'

type Hotel = { id: string; name: string }

export default function GeneratePanel({
  hotels,
  currentMonth,
}: {
  hotels: Hotel[]
  currentMonth: string
}) {
  const router = useRouter()
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? '')
  const [yearMonth, setYearMonth] = useState(currentMonth)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    if (!hotelId || !yearMonth) return
    setMessage(null)
    startTransition(async () => {
      const r = await generateMonthlyInvoice(hotelId, yearMonth)
      if (r.error) {
        setMessage({ type: 'error', text: r.error })
      } else {
        const res = r.result!
        setMessage({
          type: 'success',
          text: `生成完了 — ${res.bookings}件 / ${res.seats}名 / ¥${res.amount.toLocaleString()}`,
        })
        router.refresh()
      }
    })
  }

  if (hotels.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">月次請求生成</h2>
        <span className="text-xs text-gray-500">ホテル請求タイプのみ対象</span>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">ホテル</label>
          <select
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">対象月</label>
          <input
            type="month"
            value={yearMonth}
            onChange={e => setYearMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || !hotelId}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition disabled:opacity-60"
        >
          {isPending ? '計算中...' : '請求生成'}
        </button>
      </div>

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? '✓ ' : '✗ '}{message.text}
        </p>
      )}

      <p className="text-xs text-gray-500">
        completed / arrived 状態の予約を料金ティアで計算し、月次請求レコードを生成します。
        既存レコードは金額のみ再計算します（入金済みは変更不可）。
      </p>
    </div>
  )
}
