'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1 rounded-lg transition"
    >
      印刷
    </button>
  )
}
