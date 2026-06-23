'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-red-500 text-2xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">エラーが発生しました</h2>
        <p className="text-sm text-gray-500 font-mono text-xs mt-1">{error.digest}</p>
        <p className="text-sm text-gray-500">
          管理画面でエラーが発生しました。ページを再読み込みするか、
          再試行ボタンを押してください。
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ダッシュボードへ
          </button>
        </div>
      </div>
    </div>
  )
}
