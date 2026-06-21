'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSlot, updateSlotStatus, assignDriver } from '@/app/actions/admin'

type Slot = {
  id: string
  date: string
  departure_time: string
  capacity: number
  remaining_seats: number
  vehicle_type: string
  vehicle_plate: string | null
  cutoff_at: string
  price_per_seat_yen: number
  notes: string | null
  status: string
}

const STATUS_OPTIONS = [
  { value: 'open',      label: '受付中',   cls: 'bg-green-600 hover:bg-green-700' },
  { value: 'closed',    label: 'クローズ', cls: 'bg-gray-500 hover:bg-gray-600' },
  { value: 'suspended', label: '運休',     cls: 'bg-red-600 hover:bg-red-700' },
]

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"

// datetime-local は "YYYY-MM-DDTHH:mm" 形式が必要
function toCutoffLocal(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${da}T${h}:${mi}`
}

export function StatusToggle({ slot }: { slot: Slot }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStatus(status: string) {
    setLoading(true)
    setError('')
    const result = await updateSlotStatus(slot.id, status)
    setLoading(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">ステータスを変更</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleStatus(opt.value)}
            disabled={loading || slot.status === opt.value}
            className={`px-3 py-1.5 rounded-lg text-xs text-white font-medium transition ${opt.cls} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {opt.label}
            {slot.status === opt.value && ' ✓'}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SlotEditForm({ slot }: { slot: Slot }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_, fd) => {
      const r = await updateSlot(slot.id, fd)
      if (!r.error) { setOpen(false); router.refresh() }
      return r
    },
    null
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline"
      >
        編集
      </button>
    )
  }

  return (
    <form action={action} className="space-y-4 border-t border-gray-100 pt-4 mt-4">
      {result?.error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{result.error}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">定員（名）</label>
          <input type="number" name="capacity" required min={1} max={20}
            defaultValue={slot.capacity}
            className={fieldCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">1席あたり単価（円）</label>
          <input type="number" name="price_per_seat_yen" required min={0}
            defaultValue={slot.price_per_seat_yen}
            className={fieldCls} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500">受付締切日時</label>
        <input type="datetime-local" name="cutoff_at" required
          defaultValue={toCutoffLocal(slot.cutoff_at)}
          className={fieldCls} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500">車両ナンバープレート</label>
        <input type="text" name="vehicle_plate"
          defaultValue={slot.vehicle_plate ?? ''}
          placeholder="例: 品川 300 あ 1234"
          className={fieldCls} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-gray-500">備考</label>
        <textarea name="notes" rows={2} defaultValue={slot.notes ?? ''}
          className={`${fieldCls} resize-none`} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition disabled:opacity-60">
          {pending ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition">
          キャンセル
        </button>
      </div>
    </form>
  )
}

type DriverOption = {
  id: string
  employee_code: string
  display_name: string | null
  is_shuttle_eligible: boolean
  shuttle_score: number
}

export function DriverAssignForm({
  slotId,
  currentEmployeeCode,
  drivers,
}: {
  slotId: string
  currentEmployeeCode: string | null
  drivers: DriverOption[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(currentEmployeeCode ?? '')

  const [result, action, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_, fd) => {
      const r = await assignDriver(slotId, fd)
      if (!r.error) router.refresh()
      return r
    },
    null
  )

  const eligible   = drivers.filter(d => d.is_shuttle_eligible)
  const ineligible = drivers.filter(d => !d.is_shuttle_eligible)

  const filtered = (q: string, list: DriverOption[]) =>
    q.trim() === ''
      ? list
      : list.filter(d =>
          (d.display_name ?? '').includes(q) || d.employee_code.includes(q)
        )

  const matchedEligible   = filtered(query, eligible)
  const matchedIneligible = filtered(query, ineligible)
  const showIneligible    = query.trim() !== '' && matchedIneligible.length > 0

  return (
    <form action={action} className="space-y-3 mt-3">
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}

      <input type="hidden" name="employee_code" value={selected} />

      {/* 名前 or 社員番号で絞り込み */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="名前 or 社員番号で検索..."
        className={`${fieldCls} text-xs`}
      />

      {/* 選択済み表示 */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs text-blue-700 flex-1">
            {drivers.find(d => d.employee_code === selected)?.display_name ?? selected}
            <span className="text-blue-400 ml-1">({selected})</span>
          </span>
          <button
            type="button"
            onClick={() => setSelected('')}
            className="text-xs text-blue-400 hover:text-red-500"
          >
            解除
          </button>
        </div>
      )}

      {/* シャトル対象乗務員リスト */}
      {matchedEligible.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {matchedEligible.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setSelected(d.employee_code); setQuery('') }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50 transition border-b border-gray-100 last:border-0 ${
                selected === d.employee_code ? 'bg-blue-50' : ''
              }`}
            >
              <span className="font-medium text-gray-800">{d.display_name ?? '─'}</span>
              <span className="text-gray-500 font-mono">{d.employee_code}</span>
            </button>
          ))}
        </div>
      )}

      {/* 非対象乗務員（検索ヒット時のみ表示） */}
      {showIneligible && (
        <div className="border border-gray-100 rounded-lg overflow-hidden max-h-32 overflow-y-auto opacity-60">
          <p className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50">シャトル非対象</p>
          {matchedIneligible.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setSelected(d.employee_code); setQuery('') }}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-600">{d.display_name ?? '─'}</span>
              <span className="text-gray-500 font-mono">{d.employee_code}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition disabled:opacity-60"
      >
        {pending ? '保存中...' : selected ? 'アサインする' : 'アサイン解除'}
      </button>
    </form>
  )
}
