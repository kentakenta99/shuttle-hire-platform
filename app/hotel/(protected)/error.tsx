'use client'

import { useEffect } from 'react'

export default function HotelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[hotel] page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-red-500 text-2xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">エラーが発生しました</h2>
        <p className="text-sm text-gray-500">
          ページの読み込み中に問題が発生しました。<br />
          再試行してもエラーが続く場合はシステム担当にご連絡ください。
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
