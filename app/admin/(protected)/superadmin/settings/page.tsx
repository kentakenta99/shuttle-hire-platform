import { createAdminClient } from '@/lib/supabase/admin'
import PolicyForm from './PolicyForm'
import HotelPoliciesClient from './HotelPoliciesClient'
import SettingsAgentChat from './SettingsAgentChat'

export const dynamic = 'force-dynamic'

type CancellationPolicy = {
  threshold_hours: number
  fee_pct: number
  note: string | null
  updated_at: string
  updated_by_name: string | null
}

type Hotel = {
  id: string
  name: string
}

type SearchParams = {
  tab?: 'form' | 'agent'
}

export default async function SystemSettingsPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = await props.searchParams
  const tab = searchParams?.tab || 'form'

  const adminDb = createAdminClient()

  // グローバルデフォルト取得
  const { data: rawPolicy } = await adminDb
    .from('cancellation_policies')
    .select('threshold_hours, fee_pct, note, updated_at, updated_by_name')
    .is('hotel_id', null)
    .single()

  const policy = rawPolicy as CancellationPolicy | null

  const thresholdHours = policy?.threshold_hours ?? 2
  const feePct = policy?.fee_pct ?? 25

  const thresholdLabel = thresholdHours % 1 === 0
    ? `${thresholdHours}時間`
    : `${thresholdHours}時間（${thresholdHours * 60}分）`

  // ホテル一覧取得
  const { data: hotels } = await adminDb
    .from('hotels')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      {/* タブ切り替え */}
      <div className="flex gap-1 border-b border-gray-200">
        <a
          href="/admin/superadmin/settings?tab=form"
          className={`px-4 py-2 text-sm font-medium transition rounded-t ${
            tab === 'form'
              ? 'text-slate-800 border-b-2 border-slate-800 bg-white'
              : 'text-gray-500 hover:text-gray-600 bg-gray-50'
          }`}
        >
          フォーム入力
        </a>
        <a
          href="/admin/superadmin/settings?tab=agent"
          className={`px-4 py-2 text-sm font-medium transition rounded-t ${
            tab === 'agent'
              ? 'text-slate-800 border-b-2 border-slate-800 bg-white'
              : 'text-gray-500 hover:text-gray-600 bg-gray-50'
          }`}
        >
          🤖 AIアシスタント
        </a>
      </div>

      {/* AIアシスタントタブ */}
      {tab === 'agent' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">AI設定アシスタント</h2>
            <p className="text-sm text-gray-600 mt-1">
              自然言語でキャンセルポリシーやホテル設定を変更できます。
            </p>
          </div>
          <div className="h-[600px]">
            <SettingsAgentChat hotels={(hotels as Hotel[]) || []} />
          </div>
        </div>
      )}

      {/* フォーム入力タブ */}
      {tab === 'form' && (
        <>
          {/* グローバルデフォルト設定 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-gray-900">キャンセルポリシー — グローバルデフォルト</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ホテル別設定がない場合に適用される基本ルール。
          </p>
        </div>

        {/* 現在の設定サマリー */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl mt-0.5">📋</span>
          <div className="text-sm space-y-0.5">
            <p className="font-semibold text-gray-800">現在のデフォルト</p>
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
          isGlobal
        />
      </div>

      {/* ホテル別ポリシー設定 */}
      {(hotels && hotels.length > 0) && (
        <HotelPoliciesClient hotels={hotels as Hotel[]} />
      )}

          {/* 将来の拡張余地 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-900">将来の拡張候補</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: '⏱', title: '段階的キャンセル料', desc: '24h前10% / 2h前25% など複数閾値' },
                { icon: '📅', title: '繁忙期レート', desc: '特定日程のみ別料率を適用' },
                { icon: '💳', title: '自動返金連携', desc: '決済API連携後に自動返金処理' },
                { icon: '🌍', title: 'チャネル別ポリシー', desc: 'イベント・代理店など将来チャネル対応' },
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
        </>
      )}

    </div>
  )
}
