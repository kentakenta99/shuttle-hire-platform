'use client'

import { useState, useActionState, useEffect, useCallback, useRef } from 'react'
import { submitBookingRequest, checkRequestStatus } from '@/app/actions/request'
import type { RequestStatusResult } from '@/app/actions/request'
import FlightNumberInput from '@/app/components/FlightNumberInput'

type Tier = { party_size: number; per_person_price: number }

const DEPARTURE_TIMES = ['11:00', '12:00', '13:00', '14:00']
const POLL_INTERVAL = 30

function getPricing(tiers: Tier[], partySize: number) {
  const match = [...tiers]
    .filter(t => t.party_size <= partySize)
    .sort((a, b) => b.party_size - a.party_size)[0]
  if (!match) return null
  return { unit: match.per_person_price, total: match.per_person_price * partySize }
}

function formatDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]
  return `${dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} (${wd})`
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227] bg-white"
const selectCls = `${inputCls} appearance-none`

// 待機画面
function WaitingScreen({
  requestId,
  guestName,
}: {
  requestId: string
  guestName: string
}) {
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<RequestStatusResult>({ status: 'pending' })
  const countdownRef = useRef(POLL_INTERVAL)

  const checkStatus = useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await checkRequestStatus(requestId)
      setResult(res)
    } finally {
      setIsChecking(false)
      countdownRef.current = POLL_INTERVAL
      setCountdown(POLL_INTERVAL)
    }
  }, [requestId])

  // 初回チェック
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 非同期フェッチ後にsetStateする意図的パターン
    checkStatus()
  }, [checkStatus])

  // 自動ポーリング＋カウントダウン
  useEffect(() => {
    if (result.status !== 'pending') return

    const tick = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0) {
        countdownRef.current = POLL_INTERVAL
        setCountdown(POLL_INTERVAL)
        checkStatus()
      }
    }, 1000)

    return () => clearInterval(tick)
  }, [result.status, checkStatus])

  // 見送り
  if (result.status === 'rejected') {
    return (
      <div className="text-center space-y-5 py-10">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-3xl">✕</div>
        <div>
          <p className="text-lg font-bold text-gray-900">Request Not Available</p>
          <p className="text-sm text-gray-500 mt-1">ご希望の日程での受付が難しい状況です</p>
        </div>
        <p className="text-sm text-gray-500">
          For assistance, please visit the Concierge desk.
        </p>
      </div>
    )
  }

  // 確定済み
  if (result.status === 'confirmed') {
    return (
      <div className="space-y-6 py-4">
        {/* 確定バナー */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <p className="text-base font-bold text-green-800">Booking Confirmed!</p>
            <p className="text-xs text-green-600">ご予約が確定しました</p>
          </div>
        </div>

        {/* QRコード */}
        <div className="bg-white border-2 border-gray-900 rounded-2xl p-6 text-center space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Your QR Ticket</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.qrDataUrl}
            alt="QR Ticket"
            className="w-56 h-56 mx-auto rounded-xl"
          />

          <div className="space-y-1">
            <p className="text-xs text-gray-500">Confirmation Code</p>
            <p className="text-xl font-mono font-bold text-gray-900 tracking-widest">{result.bookingReference}</p>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 space-y-0.5">
            <p className="font-semibold">{formatDate(result.date)}</p>
            <p>{result.departureTime.slice(0, 5)} Departure · {result.partySize} {result.partySize === 1 ? 'guest' : 'guests'}</p>
            <p className="text-xs text-gray-500">{result.hotelName} → Narita Airport</p>
          </div>
        </div>

        {/* 保管案内 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 space-y-2">
          <p className="text-sm font-bold text-amber-800">スクリーンショットして保管してください</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            このQRコードが乗車チケットです。当日ドライバーにご提示ください。<br />
            QRを紛失された場合は、フロントデスクにお申し出ください。
          </p>
          <p className="text-xs text-gray-500 mt-1 border-t border-amber-200 pt-2">
            Please take a screenshot to save this QR code. Present it to the driver on the day of travel.
            If lost, contact the Concierge desk with your confirmation code.
          </p>
        </div>
      </div>
    )
  }

  // 待機中
  return (
    <div className="space-y-5 py-4">
      {/* 大きな待機メッセージ */}
      <div className="bg-black rounded-2xl px-6 py-8 text-center space-y-3">
        <div className="text-4xl animate-pulse">⏳</div>
        <div>
          <p className="text-[#C9A227] text-lg font-bold tracking-wide">Awaiting Confirmation</p>
          <p className="text-white/60 text-xs mt-0.5">確認待ち — Dear {guestName}</p>
        </div>
      </div>

      {/* キープ案内 */}
      <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-2xl px-6 py-6 space-y-3 text-center">
        <p className="text-base font-bold text-gray-900 leading-snug">
          このページを閉じずに<br />お待ちください
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          ホテルスタッフが確認後、<br />
          <span className="font-semibold text-gray-800">QRチケットがここに表示されます。</span>
        </p>
        <div className="border-t border-amber-200 pt-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Please keep this page open.<br />
            Your QR ticket will appear here once the concierge confirms your booking.
          </p>
        </div>
      </div>

      {/* 更新ボタン */}
      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={checkStatus}
          disabled={isChecking}
          className="w-full py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50"
        >
          {isChecking ? '確認中...' : '今すぐ更新する'}
        </button>
        <p className="text-xs text-gray-500">
          {isChecking ? 'Checking...' : `${countdown}秒後に自動更新 · Auto-refresh in ${countdown}s`}
        </p>
      </div>

      {/* スクショ案内（先出し） */}
      <p className="text-xs text-gray-500 text-center leading-relaxed">
        確定したらQRチケットがこの画面に表示されます。<br />
        スクリーンショットして保管してください。
      </p>
    </div>
  )
}

export default function RequestForm({
  hotelId,
  tiers,
}: {
  hotelId: string
  tiers: Tier[]
}) {
  const [partySize, setPartySize] = useState(1)
  const [guestName, setGuestName] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const r = await submitBookingRequest(formData)
      if ('success' in r) {
        setRequestId(r.requestId)
        return null
      }
      return r
    },
    null
  )

  const pricing = getPricing(tiers, partySize)

  // 提出完了 → 待機画面
  if (requestId) {
    return <WaitingScreen requestId={requestId} guestName={guestName} />
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="hotelId" value={hotelId} />

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* 客室番号 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Room Number <span className="text-red-400">*</span>
        </label>
        <input
          name="roomNumber"
          required
          placeholder="e.g. 1234"
          className={inputCls}
        />
      </div>

      {/* 氏名 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Guest Name <span className="text-red-400">*</span>
        </label>
        <input
          name="guestName"
          required
          placeholder="e.g. YAMADA Taro"
          className={inputCls}
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
        />
      </div>

      {/* 人数・荷物 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Guests <span className="text-red-400">*</span>
          </label>
          <select
            name="partySize"
            required
            className={selectCls}
            value={partySize}
            onChange={e => setPartySize(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Luggage <span className="text-red-400">*</span>
          </label>
          <select name="luggageCount" required className={selectCls}>
            {Array.from({ length: 13 }, (_, i) => i).map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'piece' : 'pieces'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 料金表示 */}
      {pricing && (
        <div className="bg-[#C9A227]/8 border border-[#C9A227]/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{partySize} {partySize === 1 ? 'guest' : 'guests'} × ¥{pricing.unit.toLocaleString()}</p>
            <p className="text-lg font-bold text-gray-900">¥{pricing.total.toLocaleString()}</p>
          </div>
          <span className="text-xs text-amber-800 font-medium bg-amber-100 px-2.5 py-1 rounded-full">Estimated fare</span>
        </div>
      )}

      {/* 出発希望日 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Preferred Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          name="preferredDate"
          required
          className={inputCls}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* 出発希望時刻 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Preferred Departure <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {DEPARTURE_TIMES.map(t => (
            <label key={t} className="relative">
              <input type="radio" name="preferredTime" value={t} required className="sr-only peer" />
              <span className="block text-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 cursor-pointer peer-checked:border-[#C9A227] peer-checked:bg-[#C9A227] peer-checked:text-black transition">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* フライト番号 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Flight Number <span className="text-red-400">*</span>
        </label>
        <FlightNumberInput
          name="flightNumber"
          required
          placeholder="e.g. NH832"
          className={inputCls}
        />
      </div>

      {/* メール（任意・バックアップ） */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Email Address
          <span className="ml-1 text-gray-500 font-normal normal-case">(optional)</span>
        </label>
        <input
          type="email"
          name="guestEmail"
          placeholder="you@example.com"
          className={inputCls}
        />
        <p className="text-xs text-gray-500">
          For backup delivery only. Your QR ticket will appear on the next screen — keep this page open after submitting.
        </p>
      </div>

      {/* 備考 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Special Requests</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Wheelchair assistance, baby stroller, etc."
          className={`${inputCls} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-black text-white py-4 rounded-xl text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-60 tracking-wide"
      >
        {pending ? 'Sending...' : 'Request Transfer →'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        This is a request, not a confirmed booking.<br />
        The concierge will confirm — keep this page open to receive your QR ticket.
      </p>
      <p className="text-[11px] text-gray-300 text-center">
        送信することで
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500 transition">
          プライバシーポリシー
        </a>
        に同意したものとみなします
      </p>
    </form>
  )
}
