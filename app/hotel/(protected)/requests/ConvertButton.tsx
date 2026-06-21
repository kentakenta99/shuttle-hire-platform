'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { convertRequestToBooking, rejectBookingRequest } from '@/app/actions/request'

type Slot = {
  id: string
  date: string
  departure_time: string
  remaining_seats: number
  status: string
}

export function ConvertButton({
  requestId,
  preferredDate,
  preferredTime,
  partySize,
  availableSlots,
}: {
  requestId: string
  preferredDate: string
  preferredTime: string
  partySize: number
  availableSlots: Slot[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // 希望日時に近いスロットを先頭に
  const sorted = [...availableSlots].sort((a, b) => {
    const aExact = a.date === preferredDate && a.departure_time.startsWith(preferredTime) ? -1 : 0
    const bExact = b.date === preferredDate && b.departure_time.startsWith(preferredTime) ? -1 : 0
    return aExact - bExact
  })

  function handleConfirm() {
    if (!selectedSlotId) { setError('便を選択してください。'); return }
    setError('')
    startTransition(async () => {
      const r = await convertRequestToBooking(requestId, selectedSlotId)
      if (r.error) { setError(r.error); return }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition font-medium"
      >
        確定する
      </button>
    )
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-700">振り当てる便を選択</p>

      {sorted.length === 0 ? (
        <p className="text-xs text-red-500">対象日に空き便がありません。</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {sorted.map(slot => {
            const isPreferred = slot.date === preferredDate && slot.departure_time.startsWith(preferredTime)
            const hasSeat = slot.remaining_seats >= partySize
            return (
              <label key={slot.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                !hasSeat ? 'opacity-40 cursor-not-allowed border-gray-100' :
                selectedSlotId === slot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name={`slot-${requestId}`}
                  value={slot.id}
                  disabled={!hasSeat}
                  onChange={() => setSelectedSlotId(slot.id)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    {' '}{slot.departure_time.slice(0, 5)} 発
                    {isPreferred && <span className="ml-1 text-[10px] text-blue-600 font-semibold">希望</span>}
                  </p>
                  <p className="text-[10px] text-gray-500">残{slot.remaining_seats}席</p>
                </div>
                {selectedSlotId === slot.id && <span className="text-blue-600 text-xs">✓</span>}
              </label>
            )
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || !selectedSlotId}
          className="flex-1 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition disabled:opacity-60 font-medium"
        >
          {isPending ? '処理中...' : '予約を確定・QR送付'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setSelectedSlotId(''); setError('') }}
          className="px-3 py-2 border border-gray-200 text-gray-600 text-xs rounded-xl hover:bg-gray-50 transition"
        >
          戻る
        </button>
      </div>
    </div>
  )
}

export function RejectButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm('このリクエストを見送りますか？')) return
        startTransition(async () => {
          await rejectBookingRequest(requestId)
          router.refresh()
        })
      }}
      className="px-3 py-2 text-xs text-gray-500 hover:text-red-500 transition disabled:opacity-60"
    >
      {isPending ? '...' : '見送る'}
    </button>
  )
}
