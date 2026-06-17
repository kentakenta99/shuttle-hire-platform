import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function formatDT(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const EVENT_BADGE: Record<string, { label: string; cls: string }> = {
  login_success:      { label: '成功',     cls: 'bg-green-100 text-green-700' },
  login_failed:       { label: '失敗',     cls: 'bg-red-100 text-red-700' },
  login_unauthorized: { label: '権限なし', cls: 'bg-orange-100 text-orange-700' },
}

const ROLE_LABEL: Record<string, string> = {
  hotel_staff: 'ホテル',
  tmk_admin:   '管理者',
  driver:      'DR',
}

export default async function AdminSecurityPage() {
  const adminDb = createAdminClient()
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString()
  const since1h  = new Date(Date.now() - 3600_000).toISOString()

  const [eventsRes, last1hRes] = await Promise.all([
    adminDb.from('auth_events').select('*').gte('created_at', since24h).order('created_at', { ascending: false }).limit(200),
    adminDb.from('auth_events').select('*').in('event_type', ['login_failed', 'login_unauthorized']).gte('created_at', since1h),
  ])

  const events = eventsRes.data ?? []
  const last1hFailed = last1hRes.data ?? []

  // 24h 統計
  const successCount = events.filter(e => e.event_type === 'login_success').length
  const failedCount  = events.filter(e => e.event_type !== 'login_success').length

  // 直近1h: IPごとの失敗回数 → 3回以上を不審とみなす
  const ipFailMap: Record<string, number> = {}
  for (const e of last1hFailed) {
    const ip = e.ip_address ?? 'unknown'
    ipFailMap[ip] = (ipFailMap[ip] ?? 0) + 1
  }
  const suspiciousIPs = Object.entries(ipFailMap)
    .filter(([, n]) => n >= 3)
    .sort(([, a], [, b]) => b - a)

  const hasSuspicious = suspiciousIPs.length > 0

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-lg font-bold text-gray-900">セキュリティログ</h1>

      {/* アラートバナー */}
      {hasSuspicious && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-4">
          <p className="text-sm font-bold text-red-800 mb-2">⚠ 不審なアクセスを検出（直近1時間）</p>
          {suspiciousIPs.map(([ip, count]) => (
            <p key={ip} className="text-sm text-red-700">
              IP: <span className="font-mono">{ip}</span> — {count}回失敗
            </p>
          ))}
          <p className="text-xs text-red-500 mt-2">該当IPからのアクセスをSupabase Dashboardで確認し、必要に応じてブロックしてください。</p>
        </div>
      )}

      {/* 24h サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '24h ログイン成功', value: successCount, cls: 'text-green-700' },
          { label: '24h 失敗・不正', value: failedCount, cls: failedCount > 0 ? 'text-red-700' : 'text-gray-500' },
          { label: '1h 不審IP数', value: suspiciousIPs.length, cls: hasSuspicious ? 'text-red-700' : 'text-gray-500' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 直近イベントログ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">直近24時間のログイン履歴</h2>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">ログがありません</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {events.map(e => {
              const badge = EVENT_BADGE[e.event_type] ?? { label: e.event_type, cls: 'bg-gray-100 text-gray-600' }
              return (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3 text-xs">
                  <span className={`shrink-0 px-2 py-0.5 rounded-full font-medium mt-0.5 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="text-gray-400 shrink-0 w-8">{ROLE_LABEL[e.role] ?? e.role}</span>
                  <span className="text-gray-700 flex-1 min-w-0 truncate">{e.email}</span>
                  <span className="text-gray-400 font-mono shrink-0">{e.ip_address ?? '─'}</span>
                  <span className="text-gray-400 shrink-0">{formatDT(e.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">Supabase Auth 追加設定（Dashboard → Authentication → Rate Limits）</p>
        <p className="text-xs text-blue-600">・Token refresh: 360 req/hour（デフォルト）</p>
        <p className="text-xs text-blue-600">・Sign in: 60 req/5min に設定推奨</p>
        <p className="text-xs text-blue-600">・Refresh Token Reuse Interval: 10秒 に設定推奨</p>
      </div>
    </div>
  )
}
