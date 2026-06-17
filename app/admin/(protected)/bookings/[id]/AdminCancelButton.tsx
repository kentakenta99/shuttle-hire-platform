'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBookingByAdmin } from '@/app/actions/admin'

export default function AdminCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, action, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_, fd) => {
      const r = await cancelBookingByAdmin(bookingId, fd.get('reason') as string)
      if (!r.error) { router.refresh() }
      return r
    },
    null
  )

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm hover:bg-red-50 transition"
      >
        管理者権限でキャンセル
      </button>
    )
  }

  return (
    <form action={action} className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">予約をキャンセルしますか？</p>
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
      <div className="space-y-1">
        <label className="text-xs text-red-700">キャンセル理由（任意）</label>
        <input
          type="text"
          name="reason"
          placeholder="例: 運休のため"
          className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={pending}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-red-700 transition">
          {pending ? 'キャンセル中...' : 'キャンセル確定'}
        </button>
        <button type="button" onClick={() => setShowConfirm(false)}
          className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
          戻る
        </button>
      </div>
    </form>
  )
}
