'use client'

import { useState, useActionState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { markBoarded, markBoardedByCode, markArrived, markNoShow } from '@/app/actions/driver'
import { useRouter } from 'next/navigation'
import type { FlightInfo } from '@/lib/flight'

const QRCameraScanner = dynamic(() => import('./QRCameraScanner'), { ssr: false })

type Booking = {
  id: string
  confirmation_code: string
  guest_name: string
  party_size: number
  luggage_count: number
  flight_number: string
  notes: string | null
  status: string
}

function formatJST(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
  })
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  confirmed: { label: '予約OK',  cls: 'bg-green-900 text-green-400' },
  completed: { label: '搭乗済',  cls: 'bg-blue-900 text-blue-400' },
  arrived:   { label: '到着済',  cls: 'bg-purple-900 text-purple-400' },
  no_show:   { label: 'NO SHOW', cls: 'bg-red-900 text-red-400' },
}

export function BoardingRow({
  booking,
  canBoard,
  flightInfo,
  hotelPhone,
  slotDate,
  slotTime,
}: {
  booking: Booking
  canBoard: boolean
  flightInfo?: FlightInfo | null
  hotelPhone?: string | null
  slotDate?: string
  slotTime?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isBoarded  = booking.status === 'completed'
  const isArrived  = booking.status === 'arrived'
  const isNoShow   = booking.status === 'no_show'
  const isDone     = isBoarded || isArrived || isNoShow
  const badge      = STATUS_BADGE[booking.status]

  async function handleBoard() {
    setLoading(true)
    await markBoarded(booking.id)
    setLoading(false)
    router.refresh()
  }

  async function handleNoShow() {
    if (!confirm(`${booking.guest_name} 様をNO-SHOWとして記録しますか？`)) return
    setLoading(true)
    const r = await markNoShow(booking.id)
    setLoading(false)
    if (r.error) { alert(r.error); return }
    router.refresh()
    // wa.me でホテルへ通知（電話番号が登録されている場合のみ）
    if (hotelPhone) {
      const phone = hotelPhone.replace(/\D/g, '').replace(/^0/, '81')
      const date = slotDate ? new Date(slotDate + 'T00:00:00').toLocaleDateString('ja-JP') : ''
      const time = slotTime ? slotTime.slice(0, 5) : ''
      const msg = encodeURIComponent(
        `【NO-SHOW報告】${date} ${time}発便\nゲスト: ${booking.guest_name} 様 (${booking.party_size}名)\nご確認をお願いします。`
      )
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    }
  }

  return (
    <div className={`px-4 py-4 transition ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-white text-sm">{booking.guest_name}</p>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
            <span className="text-xs text-gray-400">
              {booking.party_size}名 / 荷物{booking.luggage_count}個
            </span>
            <span className="text-xs text-gray-500">·</span>
            {/* フライト番号 + ターミナル + 出発時刻 */}
            <span className="text-xs font-mono text-gray-300">{booking.flight_number}</span>
            {flightInfo?.terminal && (
              <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                T{flightInfo.terminal}
              </span>
            )}
            {flightInfo?.scheduledDeparture && (
              <>
                <span className="text-xs text-gray-600">→</span>
                <span className={`text-xs font-semibold ${
                  flightInfo.delayMinutes ? 'text-orange-400' : 'text-sky-400'
                }`}>
                  {formatJST(flightInfo.estimatedDeparture ?? flightInfo.scheduledDeparture)}発
                  {flightInfo.delayMinutes
                    ? ` ⚠+${flightInfo.delayMinutes}分遅延`
                    : ' ✓定刻'}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{booking.confirmation_code}</p>
          {booking.notes && (
            <p className="text-xs text-yellow-400 mt-0.5">⚠ {booking.notes}</p>
          )}
        </div>
        {booking.status === 'confirmed' && canBoard && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleBoard}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition active:scale-95 disabled:opacity-60"
            >
              {loading ? '...' : '搭乗確認'}
            </button>
            <button
              type="button"
              onClick={handleNoShow}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 text-red-400 text-xs rounded-xl hover:bg-red-900/50 border border-red-900/60 transition active:scale-95 disabled:opacity-60"
            >
              No-Show
            </button>
          </div>
        )}
        {isDone && (
          <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            isArrived ? 'bg-purple-900 text-purple-400' : 'bg-green-900 text-green-400'
          }`}>
            ✓
          </span>
        )}
      </div>
    </div>
  )
}

export function QRScanInput({ slotId }: { slotId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [result, action, pending] = useActionState<
    { error?: string; guestName?: string } | null,
    FormData
  >(
    async (_, fd) => {
      const code = fd.get('code') as string
      const r = await markBoardedByCode(code)
      if (!r.error && inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.focus()
        router.refresh()
      }
      return r
    },
    null
  )

  // カメラでQRコードが読み取れたとき
  async function handleScanned(code: string) {
    setCameraOpen(false)
    const fd = new FormData()
    fd.set('code', code)
    // Server Actionを直接呼び出し
    const r = await markBoardedByCode(code)
    if (!r.error) {
      router.refresh()
    }
    // エラーの場合はinputに転記してユーザーに見せる
    if (r.error && inputRef.current) {
      inputRef.current.value = code
    }
  }

  return (
    <>
      {cameraOpen && (
        <QRCameraScanner
          onDetected={handleScanned}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">搭乗確認</p>
            <p className="text-xs text-gray-400 mt-0.5">QRコードをスキャンするか、確認番号を入力</p>
          </div>
          {/* カメラスキャンボタン */}
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            QRスキャン
          </button>
        </div>

        {result?.error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl px-3 py-2 text-xs text-red-400">
            {result.error}
          </div>
        )}
        {result?.guestName && !result.error && (
          <div className="bg-green-900/50 border border-green-700 rounded-xl px-3 py-2 text-xs text-green-400">
            ✓ {result.guestName} 様の搭乗を確認しました
          </div>
        )}

        {/* 手動入力フォーム */}
        <form action={action} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            name="code"
            required
            placeholder="例: TMK-202606-0001"
            autoComplete="off"
            autoCapitalize="characters"
            className="flex-1 border border-gray-600 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            style={{ backgroundColor: '#374151', color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          />
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2.5 bg-gray-600 text-white text-sm rounded-xl hover:bg-gray-500 transition active:scale-95 disabled:opacity-60 shrink-0"
          >
            {pending ? '...' : '入力'}
          </button>
        </form>
      </div>
    </>
  )
}

export function ArrivalButton({ slotId }: { slotId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleArrival() {
    setLoading(true)
    setError('')
    const r = await markArrived(slotId)
    setLoading(false)
    if (r.error) setError(r.error)
    else router.refresh()
  }

  return (
    <div className="mt-4 space-y-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleArrival}
        disabled={loading}
        className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-xl transition active:scale-95 disabled:opacity-60"
      >
        {loading ? '処理中...' : '✈ 空港到着確認（全員）'}
      </button>
    </div>
  )
}
