import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import CancelButton from './CancelButton'
import RefreshButton from '@/app/components/RefreshButton'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${wd}）`
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { new: isNew } = await searchParams
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time, cutoff_at, status), hotels(billing_type)')
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const slot = booking.shuttle_slots as {
    date: string; departure_time: string; cutoff_at: string; status: string
  } | null
  const hotelInfo = booking.hotels as { billing_type: string } | null
  const billingType = hotelInfo?.billing_type ?? 'hotel_invoice'

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const confirmUrl = `${baseUrl}/confirm/${booking.confirmation_code}`

  const qrSvg = await QRCode.toString(confirmUrl, {
    type: 'svg',
    margin: 1,
    color: { dark: '#1e293b', light: '#ffffff' },
  })

  const canCancel = booking.status === 'confirmed' &&
    slot?.cutoff_at && new Date(slot.cutoff_at) > new Date()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link href="/hotel/bookings" className="text-blue-600 text-sm hover:underline">← 予約履歴</Link>
        <RefreshButton />
      </div>

      {isNew && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-800 font-medium">
          ✅ 予約が完了しました
        </div>
      )}

      {/* QRコード */}
      {booking.status === 'confirmed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 text-center">
          <p className="text-xs text-gray-500 mb-3">ゲストのスマートフォンでスキャンしてください</p>
          <div
            className="inline-block"
            dangerouslySetInnerHTML={{ __html: qrSvg.replace('<svg', '<svg width="200" height="200"') }}
          />
          <p className="font-mono text-sm text-gray-500 mt-3">{booking.confirmation_code}</p>
        </div>
      )}

      {/* 予約詳細 */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {[
          ['お客様名', booking.guest_name],
          ['人数', `${booking.party_size}名`],
          ['フライト番号', booking.flight_number],
          ['お荷物', `${booking.luggage_count}個`],
          ['出発日時', slot ? `${formatDate(slot.date)} ${slot.departure_time.slice(0,5)} 発` : '─'],
          ['確認番号', booking.confirmation_code],
          ['ステータス', ({ confirmed: '予約OK', cancelled: 'キャンセル済', completed: '搭乗済', arrived: '到着済' } as Record<string,string>)[booking.status] ?? booking.status],
          ...(booking.notes ? [['備考', booking.notes]] : []),
          ...(booking.booked_by_name ? [['担当スタッフ', booking.booked_by_name]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex px-5 py-3 gap-4">
            <span className="text-sm text-gray-500 w-28 shrink-0">{label}</span>
            <span className="text-sm text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {/* キャンセルボタン */}
      {canCancel && (
        <div className="mt-6 space-y-3">
          <div className={`rounded-xl px-4 py-3 text-sm ${
            billingType === 'direct_guest'
              ? 'bg-blue-50 border border-blue-100 text-blue-700'
              : 'bg-gray-50 border border-gray-200 text-gray-600'
          }`}>
            {billingType === 'direct_guest'
              ? 'このゲストはドライバーへの直接払いのため、返金手続きは不要です。'
              : 'キャンセル後はこの予約が月末請求書から除外されます。'}
          </div>
          <CancelButton bookingId={id} />
        </div>
      )}

      {booking.status === 'cancelled' && (
        <div className="mt-4 text-center text-sm text-gray-500">
          このご予約はキャンセルされています
        </div>
      )}
    </div>
  )
}
