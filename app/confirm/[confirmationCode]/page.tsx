import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import GuestCancelButton from './GuestCancelButton'

type Props = { params: Promise<{ confirmationCode: string }> }

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${wd}）`
}

function LicensePlate({ plate }: { plate: string }) {
  return (
    <div className="inline-flex flex-col items-center">
      <div className="bg-white border-4 border-green-700 rounded-lg px-6 py-3 shadow-md relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-green-700 rounded-t" />
        <p className="text-xs text-green-800 font-bold tracking-widest mt-1 mb-0.5 text-center">TOKYO MK</p>
        <p className="text-3xl font-black tracking-[0.15em] text-gray-900 font-mono">{plate}</p>
      </div>
      <p className="text-xs text-gray-500 mt-1.5">お乗りになる車両</p>
    </div>
  )
}

export default async function GuestConfirmPage({ params }: Props) {
  const { confirmationCode } = await params
  const supabase = createServiceClient()

  // キャンセル済みも含めて取得（.neq('status','cancelled') を外した）
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time, vehicle_plate)')
    .eq('confirmation_code', confirmationCode.toUpperCase())
    .single()

  if (!booking) notFound()

  const slot = booking.shuttle_slots as unknown as {
    date: string
    departure_time: string
    vehicle_plate: string | null
  } | null

  // ── キャンセル済み表示 ──────────────────────────────
  if (booking.status === 'cancelled') {
    const b = booking as unknown as Record<string, unknown>
    const cancellationFee = (b.cancellation_fee as number | null) ?? 0
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg font-black tracking-tight">MK</span>
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-gray-900 leading-tight">東京エムケイ</p>
              <p className="text-xs text-gray-500">Shuttle Hire</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 space-y-2">
            <p className="text-4xl">❌</p>
            <p className="text-red-700 font-bold text-lg">この予約はキャンセル済みです</p>
            <p className="font-mono text-sm text-gray-500">{booking.confirmation_code}</p>
          </div>

          {slot && (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-sm text-gray-500">
              {formatDate(slot.date)} {slot.departure_time.slice(0, 5)} 発便
            </div>
          )}

          {cancellationFee > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm">
              <p className="text-amber-700">
                キャンセル料：<strong className="text-amber-900">¥{cancellationFee.toLocaleString()}</strong>
              </p>
              <p className="text-amber-600 text-xs mt-1">担当よりご連絡いたします</p>
            </div>
          )}

          <p className="text-center text-xs text-gray-300">© 東京エムケイ株式会社</p>
        </div>
      </div>
    )
  }

  // ── 通常チケット表示 ──────────────────────────────
  const b = booking as unknown as Record<string, unknown>
  const unitPrice: number | null = (b.unit_price as number | null) ?? null
  const totalPrice: number | null = (b.total_price as number | null) ?? null
  const originalUnitPrice: number | null = (b.original_unit_price as number | null) ?? null

  let isDirectGuest = false
  if (unitPrice != null && booking.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('billing_type')
      .eq('id', booking.hotel_id)
      .single()
    isDirectGuest = (hotel as unknown as { billing_type?: string } | null)?.billing_type === 'direct_guest'
  }

  const priceDropped = isDirectGuest && unitPrice != null && originalUnitPrice != null && unitPrice < originalUnitPrice

  const qrSvg = await QRCode.toString(booking.confirmation_code, {
    type: 'svg',
    margin: 1,
    width: 220,
    color: { dark: '#1e293b', light: '#ffffff' },
  })

  const isBoarded = booking.status === 'completed' || booking.status === 'arrived'

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-sm space-y-4">

        {/* ヘッダー */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg font-black tracking-tight">MK</span>
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-gray-900 leading-tight">東京エムケイ</p>
              <p className="text-xs text-gray-500">Shuttle Hire</p>
            </div>
          </div>
        </div>

        {/* 搭乗済みバナー */}
        {isBoarded && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center text-sm text-blue-800 font-medium">
            ✅ 乗車確認済み
          </div>
        )}

        {/* QRコード */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            乗車チケット — Boarding Pass
          </p>

          <div
            className="inline-block rounded-xl overflow-hidden"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <p className="font-mono text-base font-bold text-gray-700 mt-3 tracking-widest">
            {booking.confirmation_code}
          </p>
          <p className="text-xs text-gray-500 mt-1">ドライバーにこの画面を見せてください</p>
          <p className="text-xs text-gray-500">Please show this screen to your driver</p>
        </div>

        {/* 車両ナンバープレート */}
        {slot?.vehicle_plate && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-xs text-gray-500 mb-3">お乗りの車両 / Your Vehicle</p>
            <LicensePlate plate={slot.vehicle_plate} />
          </div>
        )}

        {/* 予約詳細 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-blue-700 px-5 py-3">
            <p className="text-blue-200 text-xs">出発</p>
            {slot && (
              <p className="text-white font-bold text-base">
                {formatDate(slot.date)}　{slot.departure_time.slice(0, 5)} 発
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {[
              ['お名前 / Name', `${booking.guest_name}`],
              ['人数 / Guests', `${booking.party_size}名`],
              ['フライト / Flight', booking.flight_number],
              ['荷物 / Luggage', `${booking.luggage_count}個`],
              ...(booking.notes ? [['備考 / Note', booking.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex px-5 py-3 gap-3">
                <span className="text-xs text-gray-500 w-32 shrink-0 mt-0.5">{label}</span>
                <span className="text-sm text-gray-900 font-medium">{value}</span>
              </div>
            ))}
            {isDirectGuest && unitPrice != null && (
              <div className="px-5 py-3 space-y-1.5">
                <div className="flex gap-3">
                  <span className="text-xs text-gray-500 w-32 shrink-0 mt-0.5">料金 / Fare</span>
                  <div>
                    {priceDropped && (
                      <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5 mb-1">
                        <span className="text-xs text-green-700 font-bold">🎉 割引適用</span>
                        <span className="text-xs text-gray-500 line-through">¥{originalUnitPrice!.toLocaleString()}/名</span>
                        <span className="text-xs text-green-600 font-bold">→ ¥{unitPrice.toLocaleString()}/名</span>
                      </div>
                    )}
                    <p className="text-sm font-bold text-gray-900">
                      {booking.party_size}名 × ¥{unitPrice.toLocaleString()} ={' '}
                      <span className="text-blue-700">¥{(totalPrice ?? unitPrice * booking.party_size).toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">車内決済 / Paid in vehicle</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* キャンセルポリシー + ボタン（搭乗済みは非表示） */}
        {!isBoarded && slot && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="text-xs text-gray-400 space-y-0.5">
              <p className="font-semibold text-gray-500">キャンセルポリシー</p>
              <p>• 出発2時間以上前：無料</p>
              <p>• 出発2時間以内：予約額の25%</p>
            </div>
            <GuestCancelButton
              confirmationCode={booking.confirmation_code}
              date={slot.date}
              departureTime={slot.departure_time}
              totalPrice={totalPrice}
            />
          </div>
        )}

        {/* 問い合わせ */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">当日のお問い合わせ / Inquiries</p>
          <p className="text-sm font-medium text-gray-900">東京エムケイ 配車センター</p>
          <p className="text-blue-600 font-bold text-lg mt-0.5">03-XXXX-XXXX</p>
        </div>

        <p className="text-center text-xs text-gray-300">© 東京エムケイ株式会社</p>
      </div>
    </div>
  )
}
