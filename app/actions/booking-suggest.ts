'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type SuggestedSlot = {
  id: string
  date: string
  departure_time: string
  remaining_seats: number
}

export async function suggestEarlierSlots(
  hotelId: string,
  date: string,
  currentDepartureTime: string,
  targetFlightHourMinute: string | null
): Promise<SuggestedSlot[]> {
  const db = createAdminClient()

  // 同じ日付・ホテルの全スロット取得
  const { data: slots } = await db
    .from('shuttle_slots')
    .select('id, date, departure_time, remaining_seats, status')
    .eq('hotel_id', hotelId)
    .eq('date', date)
    .eq('status', 'open')
    .order('departure_time', { ascending: true })

  if (!slots || slots.length === 0) {
    return []
  }

  // 現在の出発時刻より早い便をフィルタ
  const earlierSlots = slots.filter((slot: any) => {
    return slot.departure_time < currentDepartureTime && slot.remaining_seats > 0
  })

  // 3時間以上の余裕がある便をさらにフィルタ（オプション）
  // targetFlightHourMinute がある場合、そこから逆算して安全な便を判定
  if (targetFlightHourMinute) {
    const [flightHour, flightMin] = targetFlightHourMinute.split(':').map(Number)
    return earlierSlots.filter((slot: any) => {
      const [slotHour, slotMin] = slot.departure_time.split(':').map(Number)
      const diffMinutes = (flightHour * 60 + flightMin) - (slotHour * 60 + slotMin)
      return diffMinutes >= 180 // 3時間以上
    })
  }

  return earlierSlots as SuggestedSlot[]
}
