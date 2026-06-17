import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ confirmationCode: string }> }

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${wd}）`
}

export default async function GuestConfirmPage({ params }: Props) {
  const { confirmationCode } = await params
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, shuttle_slots(date, departure_time)')
    .eq('confirmation_code', confirmationCode)
    .eq('status', 'confirmed')
    .single()

  if (!booking) notFound()

  const slot = booking.shuttle_slots as unknown as { date: string; departure_time: string } | null

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <span className="text-white text-xl font-bold">MK</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">東京エムケイ</h1>
          <p className="text-sm text-gray-500">シャトルハイヤー 乗車案内</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-5 py-4">
            <p className="text-blue-100 text-xs">確認番号</p>
            <p className="text-white font-mono text-lg font-bold">{booking.confirmation_code}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              ['ご出発日', slot ? formatDate(slot.date) : '─'],
              ['出発時刻', slot ? `${slot.departure_time.slice(0, 5)}（成田空港）` : '─'],
              ['お名前', `${booking.guest_name} 様`],
              ['人数', `${booking.party_size}名`],
              ['フライト番号', booking.flight_number],
              ['お荷物', `${booking.luggage_count}個`],
              ...(booking.notes ? [['備考', booking.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex px-5 py-3 gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0 mt-0.5">{label}</span>
                <span className="text-sm text-gray-900 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">当日のお問い合わせ</p>
          <p className="text-sm font-medium text-gray-900">東京エムケイ 配車センター</p>
          <p className="text-blue-600 font-bold text-lg mt-0.5">03-XXXX-XXXX</p>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">© 東京エムケイ株式会社</p>
      </div>
    </div>
  )
}
