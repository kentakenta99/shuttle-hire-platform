'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  className?: string
  dark?: boolean
}

export default function RefreshButton({ className, dark }: Props) {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 600)
  }

  const base = dark
    ? 'text-gray-500 hover:text-white border-gray-600 hover:border-gray-400'
    : 'text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-400'

  return (
    <button
      type="button"
      onClick={handleRefresh}
      title="更新"
      className={`inline-flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs transition ${base} ${className ?? ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={spinning ? 'animate-spin' : ''}
      >
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
      更新
    </button>
  )
}
