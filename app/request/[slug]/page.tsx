import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import RequestForm from './RequestForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function RequestPage({ params }: Props) {
  const { slug } = await params
  const adminDb = createAdminClient()

  const [hotelRes, logoRes] = await Promise.all([
    adminDb.from('hotels').select('id, name').eq('slug', slug).eq('is_active', true).single(),
    Promise.resolve(null),
  ])

  if (!hotelRes.data) notFound()
  const hotel = hotelRes.data

  const { data: tiers } = await adminDb
    .from('hotel_pricing_tiers')
    .select('party_size, per_person_price')
    .eq('hotel_id', hotel.id)
    .order('party_size')

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ヘッダー */}
      <header className="bg-black">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <Image src="/logo-mk.png" alt="東京MK" width={32} height={32} className="rounded-lg" />
          <div>
            <p className="text-[#C9A227] text-xs font-semibold tracking-widest uppercase">Tokyo MK</p>
            <p className="text-white text-xs opacity-60">Exclusive Shared Transfer</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-8 space-y-6">

        {/* ヒーロー */}
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">for guests of {hotel.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Narita Airport<br />
            <span className="text-[#C9A227]">Shared Transfer</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Direct express service in premium vehicles.<br />
            Mercedes Benz V-Class · Toyota Alphard · Lexus LM
          </p>
        </div>

        {/* 便スケジュール + 料金 */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Daily Departures</p>
            <div className="flex gap-2 flex-wrap">
              {['11:00', '12:00', '13:00', '14:00'].map(t => (
                <span key={t} className="px-3 py-1.5 bg-gray-50 rounded-full text-sm font-mono font-medium text-gray-700 border border-gray-100">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Additional times 10:30–14:30 available on request.</p>
          </div>

          {tiers && tiers.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Transfer Rates</p>
              <div className="space-y-1.5">
                {tiers.map(t => (
                  <div key={t.party_size} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t.party_size} {t.party_size === 1 ? 'guest' : 'guests'}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        ¥{(t.per_person_price * t.party_size).toLocaleString()}
                      </span>
                      {t.party_size > 1 && (
                        <span className="text-xs text-gray-400 ml-1">
                          (¥{t.per_person_price.toLocaleString()} / person)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Up to 4 passengers per vehicle.</p>
            </div>
          )}
        </div>

        {/* リクエストフォーム */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Request a Transfer</h2>
          <p className="text-xs text-gray-400 mb-5">
            Fill in your details below. The concierge will confirm your booking and send a QR ticket.
          </p>
          <RequestForm hotelId={hotel.id} tiers={tiers ?? []} />
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          © Tokyo MK Co., Ltd. — For enquiries, contact the Hotel Concierge.
        </p>
      </main>
    </div>
  )
}
