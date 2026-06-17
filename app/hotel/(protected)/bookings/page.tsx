import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS = {
  confirmed: { label: '確定',       color: 'text-green-700 bg-green-50' },
  cancelled: { label: 'キャンセル', color: 'text-gray-500 bg-gray-100' },
  completed: { label: '完了',       color: 'text-blue-700 bg-blue-50'  },
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getMonth()+1}/${dt.getDate()}`
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-4">予約履歴（直近30日）</h1>
      {!bookings || bookings.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">予約履歴はありません</p>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => {
            const st = STATUS[b.status as keyof typeof STATUS] ?? { label: b.status, color: 'text-gray-500 bg-gray-100' }
            const slot = b.shuttle_slots as { date: string; departure_time: string } | null
            return (
              <Link
                key={b.id}
                href={`/hotel/bookings/${b.id}`}
                className="block bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.guest_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {slot ? `${formatDate(slot.date)} ${slot.departure_time.slice(0,5)}発` : '─'} ·{' '}
                      {b.party_size}名 · {b.flight_number}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5 font-mono">{b.confirmation_code}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
