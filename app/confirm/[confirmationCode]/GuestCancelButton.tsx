'use client'

import { useState } from 'react'
import { guestCancelBooking } from '@/app/actions/booking'

type Props = {
  confirmationCode: string
  date: string
  departureTime: string
  totalPrice: number | null
}

function calcPolicy(date: string, departureTime: string, totalPrice: number | null) {
  const departureAt = new Date(`${date}T${departureTime}+09:00`)
  const msUntil = departureAt.getTime() - Date.now()
  const isPast = msUntil < 0
  const isFee = !isPast && msUntil < 2 * 60 * 60 * 1000
  const fee = isFee && totalPrice != null ? Math.round(totalPrice * 0.25) : null
  return { isPast, isFee, fee }
}

export default function GuestCancelButton({ confirmationCode, date, departureTime, totalPrice }: Props) {
  const [open, setOpen]       = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone]       = useState(false)
  const [paidFee, setPaidFee] = useState<number | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const { isPast, isFee, fee } = calcPolicy(date, departureTime, totalPrice)

  if (isPast || done) {
    if (!done) return null

    // キャンセル完了画面
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-6 text-center space-y-2">
        <p className="text-2xl">❌</p>
        <p className="text-red-700 font-bold">キャンセル完了</p>
        {paidFee != null && paidFee > 0 ? (
          <p className="text-red-600 text-sm">
            キャンセル料 ¥{paidFee.toLocaleString()} が発生しています。
            <br />担当よりご連絡いたします。
          </p>
        ) : (
          <p className="text-gray-500 text-sm">無料でキャンセルされました。またのご利用をお待ちしています。</p>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true) }}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 active:scale-[0.99] transition"
      >
        予約をキャンセルする
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-900">予約キャンセルの確認</h2>

            {isFee ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-amber-800 text-sm font-semibold">⚠️ キャンセル料が発生します</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  出発2時間以内のキャンセルには予約額の25%のキャンセル料がかかります。
                </p>
                {fee != null && (
                  <p className="text-amber-900 font-bold text-lg mt-1">
                    キャンセル料：¥{fee.toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-green-800 text-sm font-semibold">✓ 無料でキャンセルできます</p>
                <p className="text-green-700 text-xs">出発2時間以上前のためキャンセル料はかかりません。</p>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium"
              >
                戻る
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  setError(null)
                  const result = await guestCancelBooking(confirmationCode)
                  setPending(false)
                  if ('error' in result) {
                    setError(result.error)
                  } else {
                    setPaidFee(result.fee)
                    setOpen(false)
                    setDone(true)
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {pending ? 'キャンセル中...' : 'キャンセルする'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">キャンセル後は取り消せません</p>
          </div>
        </div>
      )}
    </>
  )
}
