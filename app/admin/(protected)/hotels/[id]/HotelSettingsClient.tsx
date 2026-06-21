'use client'

import { useState, useTransition } from 'react'
import { saveHotelPricing } from '@/app/actions/admin'

type Tier = { party_size: number; per_person_price: number }
type Hotel = {
  id: string
  name: string
  billing_type: string
  contact_email: string | null
  billing_email: string | null
  contact_phone: string | null
}

const MAX_PARTY = 6

export default function HotelSettingsClient({
  hotel,
  initialTiers,
}: {
  hotel: Hotel
  initialTiers: Tier[]
}) {
  const [tiers, setTiers] = useState<Tier[]>(() => {
    const map = new Map(initialTiers.map(t => [t.party_size, t.per_person_price]))
    return Array.from({ length: MAX_PARTY }, (_, i) => ({
      party_size: i + 1,
      per_person_price: map.get(i + 1) ?? 0,
    }))
  })
  const [billingType, setBillingType] = useState(hotel.billing_type)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function updatePrice(partySize: number, value: string) {
    const price = parseInt(value.replace(/\D/g, '')) || 0
    setTiers(prev => prev.map(t => t.party_size === partySize ? { ...t, per_person_price: price } : t))
    setSaved(false)
  }

  function handleSave() {
    setError('')
    startTransition(async () => {
      const activeTiers = tiers.filter(t => t.per_person_price > 0)
      const r = await saveHotelPricing(hotel.id, billingType, activeTiers)
      if (r.error) setError(r.error)
      else setSaved(true)
    })
  }

  return (
    <div className="space-y-6">

      {/* 請求方式 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">請求方式</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'hotel_invoice', label: 'ホテル請求', desc: '月次でホテルに請求書発行' },
            { value: 'direct_guest', label: '車内決済', desc: 'ゲストが乗車時に直接支払い' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition ${
                billingType === opt.value
                  ? 'border-[#C9A227] bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="billingType"
                value={opt.value}
                checked={billingType === opt.value}
                onChange={() => { setBillingType(opt.value); setSaved(false) }}
                className="sr-only"
              />
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              <span className="text-xs text-gray-500">{opt.desc}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 人数別単価テーブル */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">人数別単価（1人あたり）</h2>
          <p className="text-xs text-gray-500 mt-0.5">¥0 の行は「料金なし」として扱います</p>
        </div>

        <div className="space-y-2">
          {tiers.map(tier => {
            const total = tier.per_person_price * tier.party_size
            return (
              <div key={tier.party_size} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12 shrink-0">{tier.party_size}名</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tier.per_person_price === 0 ? '' : tier.per_person_price.toLocaleString()}
                    onChange={e => updatePrice(tier.party_size, e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40 focus:border-[#C9A227]"
                  />
                </div>
                <span className="text-xs text-gray-500 w-28 shrink-0 text-right">
                  {total > 0 ? `合計 ¥${total.toLocaleString()}` : '─'}
                </span>
              </div>
            )
          })}
        </div>

        {/* プレビュー */}
        {tiers.some(t => t.per_person_price > 0) && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-gray-600 mb-2">プレビュー（ホテルUIに表示される内容）</p>
            {tiers.filter(t => t.per_person_price > 0).map(t => (
              <div key={t.party_size} className="flex justify-between text-xs">
                <span className="text-gray-500">{t.party_size}名</span>
                <span className="text-gray-700">
                  ¥{t.per_person_price.toLocaleString()}/名 → 合計 ¥{(t.per_person_price * t.party_size).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 bg-[#C9A227] hover:bg-yellow-500 text-black text-sm font-semibold rounded-xl transition disabled:opacity-60"
        >
          {isPending ? '保存中...' : '保存する'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ 保存しました</span>}
      </div>
    </div>
  )
}
