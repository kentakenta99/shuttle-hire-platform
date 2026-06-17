'use client'

import { useState, useActionState } from 'react'
import { createSlot, createBulkSlots } from '@/app/actions/admin'

const VEHICLE_TYPES = ['スタンダードハイヤー', 'プレミアムハイヤー']
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

type BulkResult = { error?: string; created?: number }

const initialBulkState: BulkResult = {}

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-800"

export default function SlotNewForm() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [singleState, singleAction, singlePending] = useActionState<{ error: string } | null, FormData>(
    async (_, fd) => {
      const result = await createSlot(fd)
      return result ?? null
    },
    null
  )
  const [bulkState, bulkAction, bulkPending] = useActionState<BulkResult, FormData>(
    async (_, fd) => createBulkSlots(fd),
    initialBulkState
  )

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* タブ */}
      <div className="flex border-b border-gray-200">
        {(['single', 'bulk'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              tab === t
                ? 'text-slate-800 border-b-2 border-slate-800 bg-white'
                : 'text-gray-400 hover:text-gray-600 bg-gray-50'
            }`}
          >
            {t === 'single' ? '単発作成' : '一括作成（繰り返し）'}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <form action={singleAction} className="p-6 space-y-5">
          {singleState?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {singleState.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="出発日 *">
              <input type="date" name="date" required min={today} className={fieldCls} />
            </Field>
            <Field label="出発時刻 *">
              <input type="time" name="departure_time" required className={fieldCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="定員（名） *">
              <input type="number" name="capacity" required min={1} max={20} defaultValue={3} className={fieldCls} />
            </Field>
            <Field label="車両種別 *">
              <select name="vehicle_type" required className={fieldCls}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="受付締切日時 *">
              <input type="datetime-local" name="cutoff_at" required className={fieldCls} />
            </Field>
            <Field label="1席あたり単価（円） *">
              <input type="number" name="price_per_seat_yen" required min={0} defaultValue={5000} className={fieldCls} />
            </Field>
          </div>

          <Field label="備考">
            <textarea name="notes" rows={2} placeholder="任意" className={`${fieldCls} resize-none`} />
          </Field>

          <button
            type="submit"
            disabled={singlePending}
            className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-60"
          >
            {singlePending ? '作成中...' : '出発枠を作成'}
          </button>
        </form>
      )}

      {tab === 'bulk' && (
        <form action={bulkAction} className="p-6 space-y-5">
          {bulkState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {bulkState.error}
            </div>
          )}
          {bulkState.created !== undefined && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {bulkState.created} 枠を作成しました
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="開始日 *">
              <input type="date" name="start_date" required min={today} className={fieldCls} />
            </Field>
            <Field label="終了日 *">
              <input type="date" name="end_date" required min={today} className={fieldCls} />
            </Field>
          </div>

          <Field label="曜日指定 *">
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map((wd, i) => (
                <label key={i} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={i.toString()}
                    defaultChecked={i >= 1 && i <= 5}
                    className="accent-slate-800"
                  />
                  <span className="text-sm text-gray-700">{wd}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="出発時刻 *">
              <input type="time" name="departure_time" required className={fieldCls} />
            </Field>
            <Field label="定員（名） *">
              <input type="number" name="capacity" required min={1} max={20} defaultValue={3} className={fieldCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="車両種別 *">
              <select name="vehicle_type" required className={fieldCls}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="1席あたり単価（円） *">
              <input type="number" name="price_per_seat_yen" required min={0} defaultValue={5000} className={fieldCls} />
            </Field>
          </div>
          <p className="text-xs text-gray-400">※ 受付締切は各便の前日17:00に自動設定されます</p>

          <button
            type="submit"
            disabled={bulkPending}
            className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-60"
          >
            {bulkPending ? '作成中...' : '一括作成'}
          </button>
        </form>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
