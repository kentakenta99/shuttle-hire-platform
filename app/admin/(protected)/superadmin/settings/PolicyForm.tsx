'use client'

import { useActionState } from 'react'
import { updateCancellationPolicy } from '@/app/actions/superadmin'

type Policy = {
  thresholdHours: number
  feePct: number
  note: string | null
  updatedAt: string
  updatedByName: string | null
}

export default function PolicyForm({ policy }: { policy: Policy }) {
  const [state, action, pending] = useActionState(updateCancellationPolicy, null)

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            無料キャンセル期限（時間）
            <span className="ml-1 text-gray-400 font-normal">出発の何時間前まで無料か</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="threshold_hours"
              defaultValue={policy.thresholdHours}
              min="0.5"
              max="72"
              step="0.5"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 shrink-0">時間前</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            キャンセル料率（%）
            <span className="ml-1 text-gray-400 font-normal">期限超過時に徴収する割合</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="fee_pct"
              defaultValue={policy.feePct}
              min="0"
              max="100"
              step="1"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 shrink-0">%</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">備考・変更理由</label>
        <textarea
          name="note"
          defaultValue={policy.note ?? ''}
          rows={2}
          placeholder="例：繁忙期対応で一時変更"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ ポリシーを更新しました
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-400">
          最終更新：{new Date(policy.updatedAt).toLocaleString('ja-JP')}
          {policy.updatedByName && ` — ${policy.updatedByName}`}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {pending ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  )
}
