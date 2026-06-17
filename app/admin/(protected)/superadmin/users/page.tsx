import { createAdminClient } from '@/lib/supabase/admin'
import { toggleUserActive } from '@/app/actions/superadmin'
import Link from 'next/link'
import { CreateHotelModal, CreateDriverModal, CreateAdminModal } from './UserModals'

async function doToggle(formData: FormData): Promise<void> {
  'use server'
  await toggleUserActive(formData)
}

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function SuperAdminUsersPage({ searchParams }: Props) {
  const { tab = 'hotels' } = await searchParams
  const adminDb = createAdminClient()

  // Auth ユーザー一覧（メールアドレス取得用）
  const { data: { users: authUsers } } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const [hotelsRes, driversRes, adminsRes] = await Promise.all([
    adminDb.from('hotels').select('id, name, contact_email, is_active, auth_user_id, created_at').order('created_at', { ascending: false }),
    adminDb.from('driver_users').select('id, user_id, display_name, employee_code, driver_code, is_emirates_route, is_active, created_at').order('created_at', { ascending: false }),
    adminDb.from('tmk_admin_users').select('id, user_id, display_name, is_active, created_at').order('created_at', { ascending: false }),
  ])

  const hotels = hotelsRes.data ?? []
  const drivers = driversRes.data ?? []
  const admins = (adminsRes.data ?? []) as Array<{
    id: string; user_id: string; display_name: string | null
    is_active: boolean; is_super_admin?: boolean; created_at: string
  }>

  // is_super_admin を別途取得（型の問題を回避）
  const { data: superAdminData } = await adminDb
    .from('tmk_admin_users')
    .select('id, is_super_admin')
  const superAdminMap = new Map(
    (superAdminData as unknown as Array<{ id: string; is_super_admin: boolean }> ?? [])
      .map(r => [r.id, r.is_super_admin])
  )

  const tabs = [
    { key: 'hotels', label: `ホテル`, count: hotels.length },
    { key: 'drivers', label: 'ドライバー', count: drivers.length },
    { key: 'admins', label: '管理者', count: admins.length },
  ]

  const tdCls = 'px-4 py-3'
  const thCls = 'px-4 py-2 text-left text-xs font-medium text-gray-500'

  function StatusBadge({ active }: { active: boolean }) {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {active ? '有効' : '無効'}
      </span>
    )
  }

  function ToggleBtn({ table, id, isActive }: { table: string; id: string; isActive: boolean }) {
    return (
      <form action={doToggle} className="inline">
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="is_active" value={isActive ? 'false' : 'true'} />
        <button type="submit"
          className={`text-xs px-3 py-1 rounded-lg transition ${isActive
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}>
          {isActive ? '無効化' : '有効化'}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex gap-1">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin/superadmin/users?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label} <span className="ml-1 opacity-60">({t.count})</span>
          </Link>
        ))}
      </div>

      {/* ホテル */}
      {tab === 'hotels' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">ホテルアカウント</h2>
            <CreateHotelModal />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={thCls}>ホテル名</th>
                  <th className={thCls}>ログインメール</th>
                  <th className={thCls}>連絡先メール</th>
                  <th className={thCls + ' text-center'}>状態</th>
                  <th className={thCls + ' text-center'}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hotels.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">データなし</td></tr>
                )}
                {hotels.map(h => (
                  <tr key={h.id} className={h.is_active ? '' : 'opacity-50 bg-gray-50'}>
                    <td className={tdCls + ' font-medium text-gray-900'}>{h.name}</td>
                    <td className={tdCls + ' text-gray-500 font-mono text-xs'}>
                      {h.auth_user_id ? (emailMap.get(h.auth_user_id) ?? '—') : '—'}
                    </td>
                    <td className={tdCls + ' text-gray-500 text-xs'}>{h.contact_email ?? '—'}</td>
                    <td className={tdCls + ' text-center'}><StatusBadge active={h.is_active} /></td>
                    <td className={tdCls + ' text-center'}>
                      <ToggleBtn table="hotels" id={h.id} isActive={h.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ドライバー */}
      {tab === 'drivers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">ドライバーアカウント</h2>
            <CreateDriverModal />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={thCls}>氏名</th>
                  <th className={thCls}>メール</th>
                  <th className={thCls}>社員番号</th>
                  <th className={thCls}>社員コード</th>
                  <th className={thCls + ' text-center'}>エミ便</th>
                  <th className={thCls + ' text-center'}>状態</th>
                  <th className={thCls + ' text-center'}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">データなし</td></tr>
                )}
                {drivers.map(d => (
                  <tr key={d.id} className={d.is_active ? '' : 'opacity-50 bg-gray-50'}>
                    <td className={tdCls + ' font-medium text-gray-900'}>{d.display_name ?? '—'}</td>
                    <td className={tdCls + ' text-gray-500 font-mono text-xs'}>{emailMap.get(d.user_id) ?? '—'}</td>
                    <td className={tdCls + ' font-mono text-xs text-gray-600'}>{d.employee_code}</td>
                    <td className={tdCls + ' font-mono text-xs text-gray-400'}>{(d as { driver_code?: string | null }).driver_code ?? '—'}</td>
                    <td className={tdCls + ' text-center text-xs'}>{(d as { is_emirates_route?: boolean }).is_emirates_route ? '✓' : '—'}</td>
                    <td className={tdCls + ' text-center'}><StatusBadge active={d.is_active} /></td>
                    <td className={tdCls + ' text-center'}>
                      <ToggleBtn table="driver_users" id={d.id} isActive={d.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 管理者 */}
      {tab === 'admins' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">管理者アカウント</h2>
            <CreateAdminModal />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={thCls}>氏名</th>
                  <th className={thCls}>メール</th>
                  <th className={thCls + ' text-center'}>権限</th>
                  <th className={thCls + ' text-center'}>状態</th>
                  <th className={thCls + ' text-center'}>操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">データなし</td></tr>
                )}
                {admins.map(a => (
                  <tr key={a.id} className={a.is_active ? '' : 'opacity-50 bg-gray-50'}>
                    <td className={tdCls + ' font-medium text-gray-900'}>{a.display_name ?? '—'}</td>
                    <td className={tdCls + ' text-gray-500 font-mono text-xs'}>{emailMap.get(a.user_id) ?? '—'}</td>
                    <td className={tdCls + ' text-center'}>
                      {superAdminMap.get(a.id)
                        ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👑 スーパー</span>
                        : <span className="text-xs text-gray-400">一般</span>
                      }
                    </td>
                    <td className={tdCls + ' text-center'}><StatusBadge active={a.is_active} /></td>
                    <td className={tdCls + ' text-center'}>
                      <ToggleBtn table="tmk_admin_users" id={a.id} isActive={a.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
