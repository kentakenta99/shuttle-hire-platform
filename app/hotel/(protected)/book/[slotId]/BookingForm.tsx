'use client'

import { useActionState } from 'react'
import { createBooking } from '@/app/actions/booking'

type Props = {
  slotId: string
  slotLabel: string
  capacity: number
}

const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const selectCls = "w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function BookingForm({ slotId, slotLabel, capacity }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      return createBooking(formData)
    },
    null
  )

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slotId" value={slotId} />

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
          <select name="partySize" required className={selectCls}>
            {Array.from({ length: capacity }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}名</option>
            ))}
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
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
      >
        {pending ? '予約を処理中...' : '予約を確定する'}
      </button>
    </form>
  )
}
