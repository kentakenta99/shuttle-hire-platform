'use client'

import { useState, useActionState } from 'react'
import { submitBookingRequest } from '@/app/actions/request'

type Tier = { party_size: number; per_person_price: number }

const DEPARTURE_TIMES = ['11:00', '12:00', '13:00', '14:00']

function getPricing(tiers: Tier[], partySize: number) {
  const match = [...tiers]
    .filter(t => t.party_size <= partySize)
    .sort((a, b) => b.party_size - a.party_size)[0]
  if (!match) return null
  return { unit: match.per_person_price, total: match.per_person_price * partySize }
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227] bg-white"
const selectCls = `${inputCls} appearance-none`

export default function RequestForm({
  hotelId,
  tiers,
}: {
  hotelId: string
  tiers: Tier[]
}) {
  const [partySize, setPartySize] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [guestName, setGuestName] = useState('')

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const r = await submitBookingRequest(formData)
      if ('success' in r) {
        setSubmitted(true)
        return null
      }
      return r
    },
    null
  )

  const pricing = getPricing(tiers, partySize)

  if (submitted) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="w-16 h-16 bg-[#C9A227]/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Request Received</h2>
          <p className="text-sm text-gray-500 mt-1">ご依頼を受け付けました</p>
        </div>
        <div className="bg-stone-50 rounded-2xl px-6 py-5 text-left space-y-2">
          <p className="text-sm text-gray-700">
            Dear <span className="font-semibold">{guestName}</span>,
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            We have received your transfer request. Our concierge will confirm your booking and send a QR ticket to your email shortly.
          </p>
          <p className="text-sm text-gray-500 mt-3">
            ご予約の確認後、QRチケットをメールでお送りします。<br />
            メールが届かない場合は、フロントデスクまでお申し出ください。
          </p>
        </div>
        <p className="text-xs text-gray-400">
          If you need immediate assistance, please contact the Concierge desk.
        </p>
      </div>
    )
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
          <span className="text-xs text-[#C9A227] font-medium bg-black/5 px-2.5 py-1 rounded-full">Estimated fare</span>
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
        <input
          name="flightNumber"
          required
          placeholder="e.g. NH832"
          className={inputCls}
        />
      </div>

      {/* メール */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Email Address
          <span className="ml-1 text-gray-400 font-normal normal-case">(optional — for QR ticket)</span>
        </label>
        <input
          type="email"
          name="guestEmail"
          placeholder="you@example.com"
          className={inputCls}
        />
        <p className="text-xs text-gray-400">Your booking QR code will be sent to this address.</p>
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

      <p className="text-xs text-gray-400 text-center">
        This is a request, not a confirmed booking.<br />
        The concierge will confirm and send your QR ticket.
      </p>
    </form>
  )
}
