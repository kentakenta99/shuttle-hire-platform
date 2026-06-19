import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import HotelSettingsClient from './HotelSettingsClient'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function HotelSettingsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const adminDb = createAdminClient()

  const [hotelRes, tiersRes] = await Promise.all([
    adminDb.from('hotels')
      .select('id, name, billing_type, contact_email, billing_email, contact_phone')
      .eq('id', id).single(),
    adminDb.from('hotel_pricing_tiers')
      .select('party_size, per_person_price')
      .eq('hotel_id', id)
      .order('party_size'),
  ])

  if (!hotelRes.data) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/hotels" className="text-sm text-gray-500 hover:text-gray-900">← ホテル一覧</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-bold text-gray-900">{hotelRes.data.name}</h1>
      </div>

      <HotelSettingsClient
        hotel={hotelRes.data as { id: string; name: string; billing_type: string; contact_email: string | null; billing_email: string | null; contact_phone: string | null }}
        initialTiers={tiersRes.data ?? []}
      />
    </div>
  )
}
