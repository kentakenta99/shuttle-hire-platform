import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import RequestForm from '@/app/request/[slug]/RequestForm'
import type { ShuttleSlot, Hotel } from '@/lib/database.types'

type Props = {
  params: Promise<{ id: string }>
}

export default async function HotelBookPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  // スロット取得
  const { data: slot, error: slotError } = await supabase
    .from('shuttle_slots')
    .select('*, hotels(id, name, slug)')
    .eq('id', id)
    .single()

  if (slotError || !slot) notFound()

  // スロットがホテル確定していない場合はスキップ
  const hotelId = (slot as any)?.hotel_id
  const hotelData = (slot as any)?.hotels as Hotel | null

  if (!hotelId || !hotelData) notFound()

  // /request/[slug] へリダイレクト。既存フォームを再利用
  redirect(`/request/${hotelData.slug}?slotId=${id}`)
}
