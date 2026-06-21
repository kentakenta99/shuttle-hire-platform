import { createAdminClient } from '@/lib/supabase/admin'
import PolicyForm from './PolicyForm'

export const dynamic = 'force-dynamic'

type CancellationPolicy = {
  threshold_hours: number
  fee_pct: number
  note: string | null
  updated_at: string
  updated_by_name: string | null
}

export default async function SystemSettingsPage() {
  const adminDb = createAdminClient()

  const { data: rawPolicy } = await adminDb
    .from('cancellation_policies')
    .select('threshold_hours, fee_pct, note, updated_at, updated_by_name')
    .limit(1)
    .single()

  const policy = rawPolicy as CancellationPolicy | null

  const thresholdHours = policy?.threshold_hours ?? 2
  const feePct = policy?.fee_pct ?? 25

  const thresholdLabel = thresholdHours % 1 === 0
    ? `${thresholdHours}時間`
    : `${thresholdHours}時間（${thresholdHours * 60}分）`

  return (
    <div className="space-y-6">

      {/* キャンセルポリシー */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-gray-900">キャンセルポリシー設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ゲストの自己キャンセル時に適用されるルール。変更は即時反映されます。
          </p>
        </div>

        {/* 現在の設定サマリー */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl mt-0.5">📋</span>
          <div className="text-sm space-y-0.5">
            <p className="font-semibold text-gray-800">現在の設定</p>
            <p className="text-gray-600">
              出発 <span className="font-bold text-gray-900">{thresholdLabel}以上前</span> のキャンセル → <span className="text-green-700 font-bold">無料</span>
            </p>
            <p className="text-gray-600">
              出発 <span className="font-bold text-gray-900">{thresholdLabel}以内</span> のキャンセル → 予約額の <span className="text-red-600 font-bold">{feePct}%</span> 徴収
            </p>
            {policy?.note && (
              <p className="text-gray-400 text-xs mt-1">{policy.note}</p>
            )}
          </div>
        </div>

        {/* 編集フォーム */}
        <PolicyForm
          policy={{
            thresholdHours: policy?.threshold_hours ?? 2,
            feePct: policy?.fee_pct ?? 25,
            note: policy?.note ?? null,
            updatedAt: policy?.updated_at ?? new Date().toISOString(),
            updatedByName: policy?.updated_by_name ?? null,
          }}
        />
      </div>

      {/* 今後の拡張余地（表示のみ） */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">将来の拡張候補</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: '⏱', title: '段階的キャンセル料', desc: '24h前10% / 2h前25% など複数閾値' },
            { icon: '🏨', title: 'ホテル別ポリシー', desc: 'ホテルごとに異なるキャンセル条件' },
            { icon: '📅', title: '繁忙期レート', desc: '特定日程のみ別料率を適用' },
            { icon: '💳', title: '自動返金連携', desc: '決済API連携後に自動返金処理' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg opacity-50">
              <span className="text-base">{icon}</span>
              <div>
                <p className="text-xs font-semibold text-gray-600">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
