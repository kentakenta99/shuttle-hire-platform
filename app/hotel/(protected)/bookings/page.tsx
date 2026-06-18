import { createClient } from '@/lib/supabase/server'
import RefreshButton from '@/app/components/RefreshButton'
import BookingsClient from './BookingsClient'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, party_size, flight_number, confirmation_code, status, slot_id, shuttle_slots(date, departure_time)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">予約履歴（直近30日）</h1>
        <RefreshButton />
      </div>
      <BookingsClient bookings={bookings ?? []} />
    </div>
  )
}
