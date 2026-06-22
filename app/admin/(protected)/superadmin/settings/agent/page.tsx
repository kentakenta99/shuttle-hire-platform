import { createAdminClient } from '@/lib/supabase/admin'
import SettingsAgentChat from '../SettingsAgentChat'

export const dynamic = 'force-dynamic'

type Hotel = {
  id: string
  name: string
}

export default async function SettingsAgentPage() {
  const adminDb = createAdminClient()

  // ホテル一覧取得
  const { data: hotels } = await adminDb
    .from('hotels')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定アシスタント</h1>
        <p className="text-sm text-gray-600 mt-1">
          AIが自然言語での指示を理解し、キャンセルポリシーやホテル設定を自動で変更します。
        </p>
      </div>

      {/* チャットUI */}
      <div className="h-[600px]">
        <SettingsAgentChat hotels={(hotels as Hotel[]) || []} />
      </div>

      {/* 使用例 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-sm text-gray-900">💬 使用例</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              example: '「オークラは2時間以内なら50%取ってください」',
              result: 'オークラホテル限定のポリシーを作成・更新',
            },
            {
              example: '「全ホテル共通で4時間前から25%に変更」',
              result: 'グローバルデフォルトを更新',
            },
            {
              example: '「シャングリラは無料キャンセル対応したい」',
              result: 'ポリシー内容を詳しく尋ねる',
            },
            {
              example: '「現在のオークラのポリシーって何ですか？」',
              result: '現在の設定を確認（次フェーズ）',
            },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
              <p className="text-xs font-mono text-blue-700 bg-white rounded px-2 py-1">{item.example}</p>
              <p className="text-xs text-blue-600">→ {item.result}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-amber-900">⚠️ 注意</p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>AIが解析不可能な指示の場合は、詳しく尋ねられます</li>
          <li>数値の入力ミスがないか、AIが確認をとります</li>
          <li>変更はリアルタイムで適用されます（ロールバック機能は将来実装予定）</li>
        </ul>
      </div>
    </div>
  )
}
