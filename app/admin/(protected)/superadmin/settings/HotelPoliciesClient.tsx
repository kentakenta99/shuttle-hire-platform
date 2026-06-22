'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/server'
import PolicyForm from './PolicyForm'

type Hotel = {
  id: string
  name: string
}

type CancellationPolicy = {
  id: string
  threshold_hours: number
  fee_pct: number
  note: string | null
  updated_at: string
  updated_by_name: string | null
}

type Props = {
  hotels: Hotel[]
}

export default function HotelPoliciesClient({ hotels }: Props) {
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedHotelId) return

    const fetchPolicy = async () => {
      setLoading(true)
      try {
        const supabase = await createClient()
        const { data } = await supabase
          .from('cancellation_policies')
          .select('id, threshold_hours, fee_pct, note, updated_at, updated_by_name')
          .eq('hotel_id', selectedHotelId)
          .single()

        setPolicy(data as CancellationPolicy | null)
      } catch (e) {
        console.error('ポリシー取得エラー:', e)
        setPolicy(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicy()
  }, [selectedHotelId])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900">キャンセルポリシー — ホテル別設定</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          ホテルごとに異なるキャンセルルールを指定。未設定の場合はグローバルデフォルトを適用します。
        </p>
      </div>

      {/* ホテル選択 */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">ホテル選択</label>
        <select
          value={selectedHotelId || ''}
          onChange={(e) => setSelectedHotelId(e.target.value || null)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— ホテルを選択 —</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* ポリシー表示・編集 */}
      {selectedHotelId && (
        loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <div className="space-y-4">
            {policy ? (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
                  <span className="text-lg">🏨</span>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-blue-900">
                      {hotels.find((h) => h.id === selectedHotelId)?.name} — ホテル別設定
                    </p>
                    <p className="text-blue-700 text-xs">
                      出発 <span className="font-bold">{policy.threshold_hours}時間</span> 以上前は無料 / 以内は <span className="font-bold">{policy.fee_pct}%</span> 徴収
                    </p>
                  </div>
                </div>

                <PolicyForm
                  policy={{
                    thresholdHours: policy.threshold_hours,
                    feePct: policy.fee_pct,
                    note: policy.note,
                    updatedAt: policy.updated_at,
                    updatedByName: policy.updated_by_name,
                  }}
                  hotelId={selectedHotelId}
                />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-3">
                <p className="text-sm text-amber-900 font-semibold">📋 このホテルはまだカスタム設定がありません</p>
                <p className="text-xs text-amber-700">
                  現在、グローバルデフォルトが適用されています。このホテル独自のルールを設定する場合は、下のフォームで入力してください。
                </p>

                <PolicyForm
                  policy={{
                    thresholdHours: 2,
                    feePct: 25,
                    note: null,
                    updatedAt: new Date().toISOString(),
                    updatedByName: null,
                  }}
                  hotelId={selectedHotelId}
                />
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
