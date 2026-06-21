'use client'

import { useActionState, useState } from 'react'
import { createBooking } from '@/app/actions/booking'

type PricingTier = { party_size: number; per_person_price: number }

type Props = {
  slotId: string
  slotLabel: string
  capacity: number
  pricingTiers: PricingTier[]
  billingType: 'hotel_invoice' | 'direct_guest'
}

const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const selectCls = "w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

function getPricing(tiers: PricingTier[], partySize: number) {
  // party_size 以下で最大のティアを使う（例: 3人→3人ティアがなければ2人ティア）
  const tier = [...tiers]
    .filter(t => t.party_size <= partySize)
    .sort((a, b) => b.party_size - a.party_size)[0] ?? null
  if (!tier) return null
  return { unitPrice: tier.per_person_price, totalPrice: tier.per_person_price * partySize }
}

export default function BookingForm({ slotId, slotLabel, capacity, pricingTiers, billingType }: Props) {
  const [partySize, setPartySize] = useState(1)

  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      return createBooking(formData)
    },
    null
  )

  const pricing = getPricing(pricingTiers, partySize)

  // hotel_invoice の場合は価格をフォームに含めない（請求UIでのみ計算）
  const showPrice = billingType === 'direct_guest'

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slotId" value={slotId} />
      {showPrice && pricing && (
        <>
          <input type="hidden" name="unitPrice" value={pricing.unitPrice} />
          <input type="hidden" name="totalPrice" value={pricing.totalPrice} />
        </>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
        {slotLabel}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          お客様のお名前 <span className="text-red-500">*</span>
        </label>
        <input
          name="guestName"
          required
          placeholder="例：山田 太郎 / YAMADA, Taro"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            人数 <span className="text-red-500">*</span>
          </label>
          <select
            name="partySize"
            required
            className={selectCls}
            value={partySize}
            onChange={e => setPartySize(Number(e.target.value))}
          >
            {Array.from({ length: capacity }, (_, i) => i + 1).map(n => {
              const p = showPrice ? getPricing(pricingTiers, n) : null
              return (
                <option key={n} value={n}>
                  {n}名{p ? `　¥${p.unitPrice.toLocaleString()}/名` : ''}
                </option>
              )
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            お荷物の個数 <span className="text-red-500">*</span>
          </label>
          <select name="luggageCount" required className={selectCls}>
            {Array.from({ length: 13 }, (_, i) => i).map(n => (
              <option key={n} value={n}>{n}個</option>
            ))}
          </select>
        </div>
      </div>

      {/* 料金表示（車内決済のみ） */}
      {showPrice && (
        pricing ? (
          <div className="rounded-xl px-4 py-3 border bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  {partySize}名 × ¥{pricing.unitPrice.toLocaleString()}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  ¥{pricing.totalPrice.toLocaleString()}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                車内決済
              </span>
            </div>
          </div>
        ) : pricingTiers.length > 0 ? (
          <p className="text-xs text-gray-400">この人数の料金設定はありません</p>
        ) : null
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          フライト番号 <span className="text-red-500">*</span>
        </label>
        <input
          name="flightNumber"
          required
          placeholder="例：NH832"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">備考（任意）</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="ベビーカーあり、車椅子対応等"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">担当スタッフ名（任意）</label>
        <input
          name="bookedByName"
          placeholder="例：鈴木（ベルデスク）"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          ゲストのメールアドレス（任意）
        </label>
        <input
          name="guestEmail"
          type="email"
          placeholder="例：guest@example.com"
          className={inputCls}
        />
        <p className="text-xs text-gray-400 mt-1">入力するとゲスト本人にQRコード付き乗車案内メールを送信します</p>
      </div>

      {state?.error && (
        state.error.includes('満席') || state.error.includes('締切') ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 space-y-3">
            <p className="text-sm font-medium text-orange-800">この便は満席または締切済みです</p>
            <p className="text-xs text-orange-700">別の便をお選びください。</p>
            <a
              href="/hotel/calendar"
              className="block text-center w-full border border-orange-400 text-orange-700 py-2 rounded-lg text-sm hover:bg-orange-100 transition font-medium"
            >
              ← 空き枠一覧に戻る
            </a>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )
      )}

      <button
        type="submit"
        disabled={pending || (!!state?.error && (state.error.includes('満席') || state.error.includes('締切')))}
        className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
      >
        {pending ? '予約を処理中...' : '予約を確定する'}
      </button>
    </form>
  )
}
