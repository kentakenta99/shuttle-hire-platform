import { createClient } from '@/lib/supabase/server'
import SlotList from './SlotList'
import RefreshButton from '@/app/components/RefreshButton'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const until = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { data: slots } = await supabase
    .from('shuttle_slots')
    .select('*')
    .gte('date', today)
    .lte('date', until)
    .order('date')
    .order('departure_time')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">シャトル空き枠</h1>
        <RefreshButton />
      </div>
      <SlotList initialSlots={slots ?? []} />
    </div>
  )
}
