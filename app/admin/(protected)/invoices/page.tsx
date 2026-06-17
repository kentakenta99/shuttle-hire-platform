import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ month?: string; hotel?: string }> }

const INVOICE_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:   { label: '未発行', cls: 'bg-gray-100 text-gray-600' },
  issued:  { label: '発行済', cls: 'bg-blue-100 text-blue-700' },
  paid:    { label: '入金済', cls: 'bg-green-100 text-green-700' },
}

function pad2(n: number) { return String(n).padStart(2, '0') }

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const { month, hotel: hotelFilter } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = month ?? `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('monthly_invoices')
    .select('*, hotels(name)')
    .eq('year_month', currentMonth)
    .order('created_at', { ascending: false })

  if (hotelFilter && hotelFilter !== '') query = query.eq('hotel_id', hotelFilter)

  const { data: invoices } = await query

  const totalAmount = (invoices ?? []).reduce((acc, inv) => acc + inv.total_amount_yen, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">請求管理</h1>
        <span className="text-xs text-gray-400 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full">
          Phase 1 — 基本実装
        </span>
      </div>

      {/* 月・ホテルフィルタ */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center">
        <form method="GET" className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 shrink-0">対象月:</label>
          <input
            type="month"
            name="month"
            defaultValue={currentMonth}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
          />
          <button type="submit" className="text-xs px-3 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
            検索
          </button>
        </form>
        <span className="text-xs text-gray-400 ml-auto">
          合計: ¥{totalAmount.toLocaleString()}
        </span>
      </div>

      {/* 請求一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!invoices || invoices.length === 0 ? (
          <div className="px-5 py-12 text-center space-y-3">
            <p className="text-sm text-gray-400">{currentMonth} の請求データがありません</p>
            <p className="text-xs text-gray-300">請求書は予約完了後に管理者が手動で作成します</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ホテル</th>
                  <th className="text-left px-4 py-3 font-medium">対象月</th>
                  <th className="text-center px-4 py-3 font-medium">予約件数</th>
                  <th className="text-center px-4 py-3 font-medium">搭乗人数</th>
                  <th className="text-right px-4 py-3 font-medium">請求金額</th>
                  <th className="text-left px-4 py-3 font-medium">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium">発行日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => {
                  const hotelName = (inv.hotels as { name: string } | null)?.name ?? '─'
                  const s = INVOICE_STATUS_LABEL[inv.invoice_status] ?? { label: inv.invoice_status, cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{hotelName}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.year_month}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{inv.total_bookings}件</td>
                      <td className="px-4 py-3 text-center text-gray-700">{inv.total_seats}名</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                        ¥{inv.total_amount_yen.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('ja-JP') : '─'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        <p className="font-medium mb-1">今後実装予定の機能（Phase 1 後半）</p>
        <ul className="text-xs space-y-1 text-amber-700 list-disc list-inside">
          <li>月次請求書の自動生成（対象月・ホテル選択）</li>
          <li>明細: 日付 / 便 / 乗客名 / 人数 / 単価 / 小計</li>
          <li>PDF出力 / CSV エクスポート</li>
          <li>入金済みへのステータス更新</li>
        </ul>
      </div>
    </div>
  )
}
