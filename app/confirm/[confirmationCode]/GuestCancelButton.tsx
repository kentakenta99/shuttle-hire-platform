'use client'

import { useState } from 'react'
import { guestCancelBooking } from '@/app/actions/booking'
import { sendCancelOtp, verifyCancelOtp } from '@/app/actions/cancel-otp'

type Props = {
  confirmationCode: string
  date: string
  departureTime: string
  totalPrice: number | null
  thresholdHours: number
  feePct: number
  hasEmail: boolean
}

type Step = 'idle' | 'confirm' | 'otp' | 'done'

function calcPolicy(
  date: string,
  departureTime: string,
  totalPrice: number | null,
  thresholdHours: number,
  feePct: number
) {
  const departureAt = new Date(`${date}T${departureTime}+09:00`)
  const msUntil = departureAt.getTime() - Date.now()
  const isPast = msUntil < 0
  const isFee = !isPast && msUntil < thresholdHours * 60 * 60 * 1000
  const fee = isFee && totalPrice != null ? Math.round(totalPrice * feePct / 100) : null
  return { isPast, isFee, fee }
}

function formatThreshold(hours: number) {
  return hours % 1 === 0 ? `${hours}時間` : `${hours * 60}分`
}

export default function GuestCancelButton({
  confirmationCode, date, departureTime, totalPrice, thresholdHours, feePct, hasEmail,
}: Props) {
  const [step, setStep]           = useState<Step>('idle')
  const [pending, setPending]     = useState(false)
  const [resendPending, setResendPending] = useState(false)
  const [maskedEmail, setMasked]  = useState('')
  const [otp, setOtp]             = useState('')
  const [paidFee, setPaidFee]     = useState<number | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const { isPast, isFee, fee } = calcPolicy(date, departureTime, totalPrice, thresholdHours, feePct)
  const thresholdLabel = formatThreshold(thresholdHours)

  if (isPast || step === 'done') {
    if (step !== 'done') return null
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-6 text-center space-y-2">
        <p className="text-2xl">❌</p>
        <p className="text-red-700 font-bold">キャンセル完了</p>
        {paidFee != null && paidFee > 0 ? (
          <p className="text-red-600 text-sm">
            キャンセル料 ¥{paidFee.toLocaleString()} が発生しています。<br />担当よりご連絡いたします。
          </p>
        ) : (
          <p className="text-gray-500 text-sm">無料でキャンセルされました。またのご利用をお待ちしています。</p>
        )}
      </div>
    )
  }

  // メール未登録の場合はフロント案内のみ
  if (!hasEmail) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
        オンラインキャンセルにはメールアドレスの登録が必要です。<br />
        キャンセルご希望の場合は<strong>フロントデスク</strong>までお問い合わせください。
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setStep('confirm') }}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 active:scale-[0.99] transition"
      >
        予約をキャンセルする
      </button>

      {/* ── Step 1: キャンセル確認モーダル ── */}
      {step === 'confirm' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-900">予約キャンセルの確認</h2>

            {isFee ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-amber-800 text-sm font-semibold">⚠️ キャンセル料が発生します</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  出発{thresholdLabel}以内のキャンセルには予約額の{feePct}%のキャンセル料がかかります。
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
                <p className="text-green-700 text-xs">出発{thresholdLabel}以上前のためキャンセル料はかかりません。</p>
              </div>
            )}

            <p className="text-xs text-gray-500">
              次のステップで、ご登録のメールアドレスに認証コードを送信します。
            </p>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setError(null); setStep('idle') }}
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
                  const result = await sendCancelOtp(confirmationCode)
                  setPending(false)
                  if ('error' in result) {
                    setError(result.error)
                  } else {
                    setMasked(result.maskedEmail)
                    setOtp('')
                    setStep('otp')
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {pending ? '送信中...' : '認証コードを送信'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: OTP入力モーダル ── */}
      {step === 'otp' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-gray-900">認証コードの入力</h2>

            <p className="text-sm text-gray-600">
              <strong>{maskedEmail}</strong> に6桁のコードを送信しました。<br />
              有効期限は10分間です。
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-3xl font-mono font-bold tracking-[0.4em] px-4 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="button"
              onClick={async () => {
                setPending(true)
                setError(null)
                // OTP検証
                const verifyResult = await verifyCancelOtp(confirmationCode, otp)
                if ('error' in verifyResult) {
                  setPending(false)
                  setError(verifyResult.error)
                  return
                }
                // 検証OK → キャンセル実行
                const cancelResult = await guestCancelBooking(confirmationCode)
                setPending(false)
                if ('error' in cancelResult) {
                  setError(cancelResult.error)
                } else {
                  setPaidFee(cancelResult.fee)
                  setStep('done')
                }
              }}
              disabled={pending || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {pending ? '確認中...' : 'キャンセルを確定する'}
            </button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setError(null); setStep('confirm') }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ← 戻る
              </button>
              <button
                type="button"
                disabled={resendPending || pending}
                onClick={async () => {
                  if (resendPending) return
                  setResendPending(true)
                  setError(null)
                  const result = await sendCancelOtp(confirmationCode)
                  setResendPending(false)
                  if ('error' in result) {
                    setError(result.error)
                  } else {
                    setOtp('')
                    setError(null)
                  }
                }}
                className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
              >
                {resendPending ? '送信中...' : 'コードを再送信'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">キャンセル後は取り消せません</p>
          </div>
        </div>
      )}
    </>
  )
}
