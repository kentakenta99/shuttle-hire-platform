import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminHotelsPage() {
  const supabase = await createClient()

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, slug, is_active, session_timeout_min, contact_name, contact_email, billing_email, pickup_address, created_at')
    .order('name')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">ホテル管理</h1>
        <span className="text-xs text-gray-400 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full">
          Phase 2 — 追加機能実装予定
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!hotels || hotels.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">ホテルが登録されていません</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {hotels.map(hotel => (
              <div key={hotel.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{hotel.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${hotel.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {hotel.is_active ? '有効' : '無効'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{hotel.pickup_address}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs text-gray-500">{hotel.contact_email ?? '─'}</p>
                  <p className="text-xs text-gray-400">セッション: {hotel.session_timeout_min}分</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Phase 2 で実装予定の機能</p>
        <ul className="text-xs space-y-1 text-amber-700 list-disc list-inside">
          <li>ホテルの追加・編集（名称・住所・請求先・担当者）</li>
          <li>共有アカウントのパスワードリセット</li>
          <li>セッションタイムアウト時間の変更</li>
          <li>ホテルごとの月次利用統計</li>
        </ul>
      </div>
    </div>
  )
}
