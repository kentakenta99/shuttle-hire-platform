import { createClient } from '@/lib/supabase/server'
import SlotList from './SlotList'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const { data: slots } = await supabase
    .from('shuttle_slots')
    .select('*')
    .gte('date', today)
    .lte('date', until)
    .order('date')
    .order('departure_time')

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-4">シャトル空き枠</h1>
      <SlotList initialSlots={slots ?? []} />
    </div>
  )
}
