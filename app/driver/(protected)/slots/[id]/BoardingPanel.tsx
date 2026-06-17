'use client'

import { useState, useActionState, useRef } from 'react'
import { markBoarded, markBoardedByCode } from '@/app/actions/driver'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  confirmation_code: string
  guest_name: string
  party_size: number
  luggage_count: number
  flight_number: string
  notes: string | null
  status: string
}

export function BoardingRow({ booking }: { booking: Booking }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isBoarded = booking.status === 'completed'

  async function handleBoard() {
    setLoading(true)
    await markBoarded(booking.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className={`px-4 py-4 transition ${isBoarded ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white text-sm">{booking.guest_name}</p>
            {isBoarded && (
              <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">乗車済</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {booking.party_size}名 / 荷物{booking.luggage_count}個 / {booking.flight_number}
          </p>
          {booking.notes && (
            <p className="text-xs text-yellow-400 mt-0.5">⚠ {booking.notes}</p>
          )}
        </div>
        {!isBoarded && (
          <button
            type="button"
            onClick={handleBoard}
            disabled={loading}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? '...' : '乗車確認'}
          </button>
        )}
        {isBoarded && (
          <span className="shrink-0 w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-green-400 text-sm">
            ✓
          </span>
        )}
      </div>
    </div>
  )
}

export function QRScanInput({ slotId }: { slotId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, action, pending] = useActionState<
    { error?: string; guestName?: string } | null,
    FormData
  >(
    async (_, fd) => {
      const code = fd.get('code') as string
      const r = await markBoardedByCode(code)
      if (!r.error && inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.focus()
        router.refresh()
      }
      return r
    },
    null
  )

  return (
    <form action={action} className="bg-gray-800 rounded-2xl border border-gray-700 p-4 space-y-3">
      <p className="text-sm font-medium text-white">確認番号スキャン</p>
      <p className="text-xs text-gray-400">QRコードをスキャンするか、確認番号を入力してください</p>

      {result?.error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl px-3 py-2 text-xs text-red-400">
          {result.error}
        </div>
      )}
      {result?.guestName && !result.error && (
        <div className="bg-green-900/50 border border-green-700 rounded-xl px-3 py-2 text-xs text-green-400">
          ✓ {result.guestName} 様の乗車を確認しました
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          name="code"
          required
          placeholder="例: ABC-123456"
          autoComplete="off"
          autoCapitalize="characters"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition active:scale-95 disabled:opacity-60 shrink-0"
        >
          {pending ? '...' : '確認'}
        </button>
      </div>
    </form>
  )
}
