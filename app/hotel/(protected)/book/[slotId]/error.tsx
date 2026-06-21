'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function BookingErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[booking] 予約処理中に予期しないエラー:', error)
  }, [error])

  return (
    <div className="text-center py-16 px-4">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">予約処理中にエラーが発生しました</h2>
      <p className="text-sm text-gray-500 mb-6">
        一時的な問題の可能性があります。もう一度お試しください。
        <br />
        改善しない場合は TMK 配車センターへご連絡ください。
      </p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button
          onClick={reset}
          className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          もう一度試す
        </button>
        <Link
          href="/hotel/calendar"
          className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition text-center"
        >
          ← 空き枠一覧に戻る
        </Link>
      </div>
    </div>
  )
}
