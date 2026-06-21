import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BookingForm from './BookingForm'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slotId: string }> }

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日（${wd}）`
}

export default async function BookPage({ params }: Props) {
  const { slotId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [slotRes, hotelRes] = await Promise.all([
    supabase.from('shuttle_slots').select('*').eq('id', slotId).single(),
    supabase.from('hotels').select('id, name, billing_type').eq('auth_user_id', user.id).single(),
  ])

  const slot = slotRes.data
  const hotel = hotelRes.data

  if (!slot || !hotel) notFound()
  if (slot.status !== 'open' || slot.remaining_seats <= 0 || new Date(slot.cutoff_at) <= new Date()) notFound()

  // ホテルの人数別料金を取得
  const { data: tiers } = await supabase
    .from('hotel_pricing_tiers')
    .select('party_size, per_person_price')
    .eq('hotel_id', hotel.id)
    .order('party_size')

  const pricingTiers = tiers ?? []
  const billingType = (hotel.billing_type ?? 'hotel_invoice') as 'hotel_invoice' | 'direct_guest'

  const slotLabel = `${formatDate(slot.date)}　${slot.departure_time.slice(0,5)} 発　残${slot.remaining_seats}席`

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/hotel/calendar" className="text-blue-600 text-sm hover:underline">← 空き枠一覧</Link>
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">予約の入力</h1>
      <BookingForm
        slotId={slotId}
        slotLabel={slotLabel}
        slotDate={slot.date}
        capacity={slot.remaining_seats}
        pricingTiers={pricingTiers}
        billingType={billingType}
      />
    </div>
  )
}
