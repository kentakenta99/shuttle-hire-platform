'use client'

import { useEffect } from 'react'

export default function DriverError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[driver] page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-gray-950">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 bg-red-900/40 rounded-full flex items-center justify-center mx-auto">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-white">エラーが発生しました</h2>
        <p className="text-sm text-gray-400">
          画面の読み込みに失敗しました。<br />
          電波状況を確認してから再試行してください。
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
