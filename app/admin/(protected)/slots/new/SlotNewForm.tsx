'use client'

import { useState, useActionState } from 'react'
import { createSlot, createBulkSlots } from '@/app/actions/admin'

const VEHICLE_TYPES = ['トヨタアルファード', 'Vクラス', 'レクサスLM', '未定']
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// 10分単位の時刻オプション
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

type BulkResult = { error?: string; created?: number }
const initialBulkState: BulkResult = {}

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-800"

export default function SlotNewForm() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [cutoffMode, setCutoffMode] = useState<'hours_before' | 'datetime'>('hours_before')

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
                : 'text-gray-500 hover:text-gray-600 bg-gray-50'
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
              <select name="departure_time" required defaultValue="09:00" className={fieldCls}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
            <Field label="受付締切 *">
              <div className="space-y-2">
                {/* モード切替ラジオ */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      value="hours_before"
                      checked={cutoffMode === 'hours_before'}
                      onChange={() => setCutoffMode('hours_before')}
                      className="accent-slate-800"
                    />
                    <span className="text-xs text-gray-600">何時間前</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      value="datetime"
                      checked={cutoffMode === 'datetime'}
                      onChange={() => setCutoffMode('datetime')}
                      className="accent-slate-800"
                    />
                    <span className="text-xs text-gray-600">日時指定</span>
                  </label>
                </div>
                <input type="hidden" name="cutoff_mode" value={cutoffMode} />
                {cutoffMode === 'hours_before' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="cutoff_hours_before"
                      required
                      min={1}
                      max={168}
                      defaultValue={24}
                      className={`${fieldCls} w-24`}
                    />
                    <span className="text-sm text-gray-500 shrink-0">時間前</span>
                  </div>
                ) : (
                  <input type="datetime-local" name="cutoff_at" required className={fieldCls} />
                )}
              </div>
            </Field>
            <Field label="1席あたり単価（円） *">
              <input type="number" name="price_per_seat_yen" required min={0} defaultValue={5000} className={fieldCls} />
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1 leading-relaxed">
                ⚠️ ホテル別の料金ティア設定がある場合、この単価は上書きされます。<br />
                実際の請求額は <span className="font-semibold">ホテル設定 → 料金ティア</span> を確認してください。
              </p>
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
              <select name="departure_time" required defaultValue="09:00" className={fieldCls}>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1 leading-relaxed">
                ⚠️ ホテル別の料金ティア設定がある場合、この単価は上書きされます。<br />
                実際の請求額は <span className="font-semibold">ホテル設定 → 料金ティア</span> を確認してください。
              </p>
            </Field>
          </div>
          <p className="text-xs text-gray-500">※ 受付締切は各便の前日17:00に自動設定されます</p>

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
