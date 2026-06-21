import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminCancelButton from './AdminCancelButton'
import RefreshButton from '@/app/components/RefreshButton'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  confirmed: { label: '予約OK',       cls: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'キャンセル済', cls: 'bg-red-100 text-red-700 border-red-200' },
  completed: { label: '搭乗済',       cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  arrived:   { label: '到着済',       cls: 'bg-purple-100 text-purple-700 border-purple-200' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time, cutoff_at, vehicle_type)')
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('name')
    .eq('id', booking.hotel_id)
    .single()

  const slot = booking.shuttle_slots as {
    date: string; departure_time: string; cutoff_at: string; vehicle_type: string
  } | null

  const s = STATUS_LABEL[booking.status] ?? { label: booking.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  const canCancel = booking.status === 'confirmed'

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/bookings" className="text-sm text-blue-600 hover:underline">← 予約一覧</Link>
        <RefreshButton />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-gray-900">{booking.confirmation_code}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{booking.guest_name} 様</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full border font-medium ${s.cls}`}>
          {s.label}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {[
          ['お客様名', booking.guest_name],
          ['ホテル', hotel?.name ?? '─'],
          ['出発日', slot ? slot.date : '─'],
          ['出発時刻', slot ? `${slot.departure_time.slice(0, 5)} 発` : '─'],
          ['車両種別', slot?.vehicle_type ?? '─'],
          ['人数', `${booking.party_size}名`],
          ['お荷物', `${booking.luggage_count}個`],
          ['フライト番号', booking.flight_number],
          ['備考', booking.notes ?? '─'],
          ['担当スタッフ', booking.booked_by_name ?? '─'],
          ['予約日時', formatDateTime(booking.created_at)],
          ...(booking.cancelled_at ? [['キャンセル日時', formatDateTime(booking.cancelled_at)]] : []),
          ...(booking.cancelled_reason ? [['キャンセル理由', booking.cancelled_reason]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex px-5 py-3 gap-4">
            <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
            <span className="text-sm text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {slot && (
        <div className="text-right">
          <Link href={`/admin/slots/${booking.slot_id}`} className="text-sm text-blue-600 hover:underline">
            出発枠を表示 →
          </Link>
        </div>
      )}

      {canCancel && (
        <AdminCancelButton bookingId={id} />
      )}

      {booking.status === 'cancelled' && (
        <p className="text-center text-sm text-gray-500">この予約はキャンセル済みです</p>
      )}
    </div>
  )
}
