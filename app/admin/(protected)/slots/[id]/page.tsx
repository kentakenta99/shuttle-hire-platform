import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusToggle, SlotEditForm, DriverAssignForm } from './SlotActions'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open:      { label: '受付中',   cls: 'bg-green-100 text-green-700 border-green-200' },
  full:      { label: '満席',     cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  closed:    { label: 'クローズ', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: '運休',     cls: 'bg-red-100 text-red-700 border-red-200' },
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const wd = ['日','月','火','水','木','金','土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日（${wd}）`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function SlotDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [slotRes, bookingsRes, assignmentRes] = await Promise.all([
    supabase.from('shuttle_slots').select('*').eq('id', id).single(),
    supabase
      .from('bookings')
      .select('id, confirmation_code, guest_name, party_size, luggage_count, flight_number, status, notes')
      .eq('slot_id', id)
      .eq('status', 'confirmed')
      .order('created_at'),
    supabase
      .from('driver_assignments')
      .select('*, driver_users(display_name, employee_code)')
      .eq('slot_id', id)
      .maybeSingle(),
  ])

  if (!slotRes.data) notFound()
  const slot = slotRes.data
  const bookings = bookingsRes.data ?? []
  const assignment = assignmentRes.data
  const driver = assignment?.driver_users as { display_name: string | null; employee_code: string } | null

  const s = STATUS_LABEL[slot.status] ?? { label: slot.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  const booked = slot.capacity - slot.remaining_seats

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/slots" className="text-sm text-blue-600 hover:underline">← 出発枠一覧</Link>
      </div>

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {formatDate(slot.date)} {slot.departure_time.slice(0, 5)} 発
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{slot.vehicle_type}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full border font-medium ${s.cls}`}>
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 枠情報 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">出発枠情報</h2>
            <SlotEditForm slot={slot} />
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['出発日', formatDate(slot.date)],
              ['出発時刻', slot.departure_time.slice(0, 5)],
              ['車両種別', slot.vehicle_type],
              ['定員 / 残席', `${slot.capacity}名 / ${slot.remaining_seats}名`],
              ['予約数', `${booked}名（${slot.capacity > 0 ? Math.round(booked / slot.capacity * 100) : 0}%）`],
              ['1席単価', `¥${slot.price_per_seat_yen.toLocaleString()}`],
              ['受付締切', formatDateTime(slot.cutoff_at)],
              ['備考', slot.notes ?? '─'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

          <StatusToggle slot={slot} />
        </div>

        {/* ドライバーアサイン */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">ドライバーアサイン</h2>
          {driver ? (
            <div className="bg-blue-50 rounded-lg px-3 py-3">
              <p className="text-sm font-medium text-blue-800">{driver.display_name ?? '名前未設定'}</p>
              <p className="text-xs text-blue-500 mt-0.5">{driver.employee_code}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">未アサイン</p>
          )}
          <DriverAssignForm
            slotId={slot.id}
            currentEmployeeCode={assignment?.employee_code ?? null}
          />
        </div>
      </div>

      {/* 乗車リスト */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            乗車リスト
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {bookings.length}件 / {bookings.reduce((a, b) => a + b.party_size, 0)}名
            </span>
          </h2>
          {bookings.length > 0 && <PrintButton />}
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">予約なし</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">No.</th>
                  <th className="text-left px-4 py-2.5 font-medium">お客様名</th>
                  <th className="text-center px-4 py-2.5 font-medium">人数</th>
                  <th className="text-center px-4 py-2.5 font-medium">荷物</th>
                  <th className="text-left px-4 py-2.5 font-medium">フライト</th>
                  <th className="text-left px-4 py-2.5 font-medium">確認番号</th>
                  <th className="text-left px-4 py-2.5 font-medium">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b, i) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/admin/bookings/${b.id}`} className="hover:text-blue-600 transition">
                        {b.guest_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{b.party_size}名</td>
                    <td className="px-4 py-3 text-center text-gray-700">{b.luggage_count}個</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{b.flight_number}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{b.confirmation_code}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.notes ?? '─'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 font-medium">合計</td>
                  <td className="px-4 py-2.5 text-center font-medium">
                    {bookings.reduce((a, b) => a + b.party_size, 0)}名
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium">
                    {bookings.reduce((a, b) => a + b.luggage_count, 0)}個
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
