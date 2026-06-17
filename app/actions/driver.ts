'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markBoarded(
  bookingId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'confirmed')

  if (error) return { error: error.message }
  revalidatePath('/driver/slots/[id]', 'page')
  return {}
}

export async function markBoardedByCode(
  confirmationCode: string
): Promise<{ error?: string; guestName?: string }> {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, status')
    .eq('confirmation_code', confirmationCode.trim().toUpperCase())
    .single()

  if (!booking) return { error: '確認番号が見つかりません' }
  if (booking.status === 'completed') return { error: `${booking.guest_name} 様はすでに乗車確認済みです` }
  if (booking.status !== 'confirmed') return { error: 'この予約はキャンセルされています' }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', booking.id)

  if (error) return { error: error.message }
  revalidatePath('/driver/slots/[id]', 'page')
  return { guestName: booking.guest_name }
}
