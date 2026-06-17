'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  timeoutMin: number
  loginPath: string
}

export default function SessionGuard({ timeoutMin, loginPath }: Props) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const warningShownRef = useRef(false)

  const timeoutMs = timeoutMin * 60 * 1000
  const warningMs = 5 * 60 * 1000

  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now()
      if (warningShownRef.current) {
        setShowWarning(false)
        warningShownRef.current = false
      }
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }))

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current
      if (idle >= timeoutMs) {
        router.push(loginPath)
      } else if (idle >= timeoutMs - warningMs && !warningShownRef.current) {
        warningShownRef.current = true
        setShowWarning(true)
      }
    }, 10_000)

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity))
      clearInterval(timer)
    }
  }, [timeoutMs, warningMs, loginPath, router])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
        <p className="text-lg font-bold text-gray-900 mb-2">まもなくログアウトします</p>
        <p className="text-sm text-gray-500 mb-6">操作がない状態が続いています。続行しますか？</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              lastActivityRef.current = Date.now()
              setShowWarning(false)
              warningShownRef.current = false
            }}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            はい、続行する
          </button>
          <button
            onClick={() => router.push(loginPath)}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
