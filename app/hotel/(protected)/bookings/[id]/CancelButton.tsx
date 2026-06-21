'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from '@/app/actions/booking'

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    setLoading(true)
    const result = await cancelBooking(bookingId, reason || undefined)
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm hover:bg-red-50 transition"
      >
        この予約をキャンセルする
      </button>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">本当にキャンセルしますか？</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-1">
        <label className="text-xs text-red-700">キャンセル理由（任意）</label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="例: ご予定変更のため"
          className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-red-700 transition"
        >
          {loading ? 'キャンセル中...' : 'はい、キャンセルする'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError(''); setReason('') }}
          className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-sm"
        >
          戻る
        </button>
      </div>
    </div>
  )
}
