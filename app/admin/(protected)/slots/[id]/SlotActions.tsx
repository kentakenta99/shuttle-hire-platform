'use client'

import { useState, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSlot, updateSlotStatus, assignDriver, unassignDriver } from '@/app/actions/admin'

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
  currentDriverName,
  drivers,
}: {
  slotId: string
  currentEmployeeCode: string | null
  currentDriverName: string | null
  drivers: DriverOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isAssigned = !!currentEmployeeCode

  // 検索実行
  function handleSearch() {
    setSearched(true)
    setSelectedCode(null)
  }

  // 検索結果フィルタ
  const q = query.trim()
  const filteredDrivers = !searched ? [] : drivers.filter(d =>
    q === '' ? d.is_shuttle_eligible : (
      (d.display_name ?? '').includes(q) || d.employee_code.includes(q)
    )
  )
  const eligibleResults   = filteredDrivers.filter(d => d.is_shuttle_eligible)
  const ineligibleResults = filteredDrivers.filter(d => !d.is_shuttle_eligible)

  // チェックボックス：同じコードを再クリックで解除
  function toggleSelect(code: string) {
    setSelectedCode(prev => prev === code ? null : code)
  }

  // アサイン実行
  function handleAssign() {
    if (!selectedCode) return
    setError('')
    startTransition(async () => {
      const r = await assignDriver(slotId, selectedCode)
      if (r.error) setError(r.error)
      else {
        setQuery('')
        setSearched(false)
        setSelectedCode(null)
        router.refresh()
      }
    })
  }

  // 解除実行
  function handleUnassign() {
    setError('')
    startTransition(async () => {
      const r = await unassignDriver(slotId)
      if (r.error) setError(r.error)
      else router.refresh()
    })
  }

  // ── アサイン済み表示 ──────────────────────────────
  if (isAssigned) {
    return (
      <div className="space-y-3 mt-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-green-600 text-base">✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 truncate">
              {currentDriverName ?? currentEmployeeCode}
            </p>
            <p className="text-xs text-green-600 font-mono">{currentEmployeeCode}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUnassign}
          disabled={isPending}
          className="w-full py-2 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition disabled:opacity-40"
        >
          {isPending ? '処理中...' : 'アサイン解除'}
        </button>
      </div>
    )
  }

  // ── 未アサイン：検索 → チェックボックス選択 ──────
  return (
    <div className="space-y-3 mt-3">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* 検索フィールド */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSearched(false); setSelectedCode(null) }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder="名前または社員番号"
          className={`${fieldCls} text-xs flex-1`}
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-3 py-2 bg-slate-700 text-white text-xs rounded-lg hover:bg-slate-600 transition whitespace-nowrap"
        >
          検索
        </button>
      </div>

      {/* 検索結果リスト（チェックボックス式） */}
      {searched && (
        <>
          {eligibleResults.length === 0 && ineligibleResults.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded-lg">
              該当するドライバーが見つかりません
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {eligibleResults.map(d => (
                <label
                  key={d.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50 transition ${
                    selectedCode === d.employee_code ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCode === d.employee_code}
                    onChange={() => toggleSelect(d.employee_code)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-800">{d.display_name ?? '─'}</span>
                  <span className="text-xs text-gray-400 font-mono">{d.employee_code}</span>
                </label>
              ))}
              {ineligibleResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-400">シャトル非対象</span>
                  </div>
                  {ineligibleResults.map(d => (
                    <label
                      key={d.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition opacity-60 ${
                        selectedCode === d.employee_code ? 'bg-gray-100 opacity-100' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCode === d.employee_code}
                        onChange={() => toggleSelect(d.employee_code)}
                        className="w-4 h-4 rounded border-gray-300 accent-gray-600"
                      />
                      <span className="flex-1 text-sm text-gray-600">{d.display_name ?? '─'}</span>
                      <span className="text-xs text-gray-400 font-mono">{d.employee_code}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* アサインボタン（選択後にのみ表示） */}
      {selectedCode && (
        <button
          type="button"
          onClick={handleAssign}
          disabled={isPending}
          className="w-full py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition disabled:opacity-40"
        >
          {isPending ? '処理中...' : 'アサインする'}
        </button>
      )}
    </div>
  )
}
