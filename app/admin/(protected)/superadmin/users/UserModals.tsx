'use client'

import { useState, useActionState } from 'react'
import { createHotelAccount, createDriverAccount, createTmkAdminAccount } from '@/app/actions/superadmin'

type Result = { error?: string; success?: boolean } | null

function Modal({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, name, type = 'text', placeholder, required }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

export function CreateHotelModal() {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<Result, FormData>(
    async (_, fd) => {
      const r = await createHotelAccount(null, fd)
      if (r.success) setOpen(false)
      return r
    },
    null
  )

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition">
        + ホテル追加
      </button>
      {open && (
        <Modal title="ホテルアカウント追加" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-3">
            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{result.error}</div>
            )}
            <Field label="ホテル名" name="name" placeholder="ホテルオークラ東京" required />
            <Field label="ログインメール（認証用）" name="email" type="email" placeholder="okura@hotel.jp" required />
            <Field label="初期パスワード" name="password" type="password" placeholder="8文字以上" required />
            <Field label="お迎え住所" name="pickup_address" placeholder="港区虎ノ門2-10-4" required />
            <Field label="担当者名" name="contact_name" placeholder="田中 太郎" />
            <Field label="請求先メール" name="billing_email" type="email" placeholder="未入力時はログインメールを使用" />
            <button type="submit" disabled={pending}
              className="w-full py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition disabled:opacity-60">
              {pending ? '作成中...' : '作成する'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}

export function CreateDriverModal() {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<Result, FormData>(
    async (_, fd) => {
      const r = await createDriverAccount(null, fd)
      if (r.success) setOpen(false)
      return r
    },
    null
  )

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition">
        + ドライバー追加
      </button>
      {open && (
        <Modal title="ドライバーアカウント追加" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-3">
            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{result.error}</div>
            )}
            <Field label="氏名" name="display_name" placeholder="山田 太郎" required />
            <Field label="ログインメール" name="email" type="email" placeholder="yamada@mktaxi.co.jp" required />
            <Field label="初期パスワード" name="password" type="password" placeholder="8文字以上" required />
            <Field label="乗務員コード（ABCコード・7桁）" name="employee_code" placeholder="1234567" required />
            <Field label="社員コード（8桁ゼロ埋め）" name="driver_code" placeholder="00012345" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="emirates_chk" name="is_emirates_route" value="1"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="emirates_chk" className="text-xs text-gray-600">エミレーツ便専任</label>
            </div>
            <button type="submit" disabled={pending}
              className="w-full py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition disabled:opacity-60">
              {pending ? '作成中...' : '作成する'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}

export function CreateAdminModal() {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<Result, FormData>(
    async (_, fd) => {
      const r = await createTmkAdminAccount(null, fd)
      if (r.success) setOpen(false)
      return r
    },
    null
  )

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition">
        + 管理者追加
      </button>
      {open && (
        <Modal title="管理者アカウント追加" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-3">
            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{result.error}</div>
            )}
            <Field label="氏名" name="display_name" placeholder="鈴木 花子" required />
            <Field label="ログインメール" name="email" type="email" placeholder="suzuki@mktaxi.co.jp" required />
            <Field label="初期パスワード" name="password" type="password" placeholder="8文字以上" required />
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="superadmin_chk" name="is_super_admin" value="1"
                className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="superadmin_chk" className="text-xs text-gray-600">
                スーパー管理者権限を付与（ユーザーCRUD・全統計閲覧）
              </label>
            </div>
            <button type="submit" disabled={pending}
              className="w-full py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition disabled:opacity-60">
              {pending ? '作成中...' : '作成する'}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
