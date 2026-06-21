import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ConvertButton, RejectButton } from './ConvertButton'
import RefreshButton from '@/app/components/RefreshButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_BADGE = {
  pending:   { label: '未処理', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '確定済', cls: 'bg-green-100 text-green-700' },
  rejected:  { label: '見送り', cls: 'bg-gray-100 text-gray-500' },
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getMonth() + 1}/${dt.getDate()}（${wd}）`
}

export default async function HotelRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const adminDb = createAdminClient()

  const { data: hotel } = await adminDb
    .from('hotels')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single()
  if (!hotel) notFound()

  // リクエスト一覧（直近30日）
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: requests } = await adminDb
    .from('booking_requests')
    .select('*')
    .eq('hotel_id', hotel.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  const allRequests = requests ?? []
  const pending   = allRequests.filter(r => r.status === 'pending')
  const processed = allRequests.filter(r => r.status !== 'pending')

  // pending リクエストに振り当て可能な空き枠を取得（希望日 ± 3日）
  const preferredDates = [...new Set(pending.map(r => r.preferred_date as string))]
  let availableSlots: {
    id: string; date: string; departure_time: string
    remaining_seats: number; status: string; request_date: string
  }[] = []

  if (preferredDates.length > 0) {
    const minDate = preferredDates.reduce((a, b) => a < b ? a : b)
    const maxDate = new Date(preferredDates.reduce((a, b) => a > b ? a : b) + 'T00:00:00')
    maxDate.setDate(maxDate.getDate() + 3)

    const { data: slots } = await adminDb
      .from('shuttle_slots')
      .select('id, date, departure_time, remaining_seats, status')
      .eq('status', 'open')
      .gte('date', minDate)
      .lte('date', maxDate.toISOString().split('T')[0])
      .gt('remaining_seats', 0)
      .order('date')
      .order('departure_time')

    availableSlots = (slots ?? []).map(s => ({ ...s, request_date: '' }))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="mb-2">
        <Link href="/hotel/calendar" className="text-blue-600 text-sm hover:underline">← 空き枠一覧</Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">シャトルリクエスト</h1>
          <p className="text-xs text-gray-500 mt-0.5">QRコード経由でゲストが送信したリクエスト</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
              未処理 {pending.length}件
            </span>
          )}
          <RefreshButton />
        </div>
      </div>

      {/* 未処理リクエスト */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-sm text-gray-500">未処理のリクエストはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(req => {
            const slotsForReq = availableSlots.filter(s =>
              s.remaining_seats >= req.party_size
            )
            return (
              <div key={req.id} className="bg-white rounded-xl border border-amber-200 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{req.guest_name}</p>
                      <span className="text-xs text-gray-500">客室 {req.room_number}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-gray-600">
                        {formatDate(req.preferred_date)} {req.preferred_time} 希望
                      </span>
                      <span className="text-xs text-gray-500">{req.party_size}名 / 荷物{req.luggage_count}個</span>
                      <span className="text-xs font-mono text-gray-500">{req.flight_number}</span>
                    </div>
                    {req.guest_email && (
                      <p className="text-xs text-blue-500 mt-0.5">{req.guest_email}</p>
                    )}
                    {req.notes && (
                      <p className="text-xs text-amber-600 mt-0.5">⚠ {req.notes}</p>
                    )}
                  </div>
                  <RejectButton requestId={req.id} />
                </div>

                <ConvertButton
                  requestId={req.id}
                  preferredDate={req.preferred_date}
                  preferredTime={req.preferred_time}
                  partySize={req.party_size}
                  availableSlots={slotsForReq}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* 処理済みリクエスト */}
      {processed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">処理済み（直近30日）</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {processed.map(req => {
              const badge = STATUS_BADGE[req.status as keyof typeof STATUS_BADGE]
              return (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium">{req.guest_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(req.preferred_date)} {req.preferred_time} / {req.party_size}名 / {req.flight_number}
                    </p>
                  </div>
                  <p className="text-xs text-gray-300 shrink-0">
                    {new Date(req.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
