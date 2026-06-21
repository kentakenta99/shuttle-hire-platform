import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ code?: string }> }

export default async function LookupPage({ searchParams }: Props) {
  const { code } = await searchParams
  const trimmed = code?.toUpperCase().trim() ?? ''

  type LookupState = 'idle' | 'not_found' | 'cancelled'
  let state: LookupState = 'idle'

  if (trimmed) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('bookings')
      .select('confirmation_code, status')
      .eq('confirmation_code', trimmed)
      .maybeSingle()

    if (!data) {
      state = 'not_found'
    } else if (data.status === 'cancelled') {
      state = 'cancelled'
    } else {
      redirect(`/confirm/${data.confirmation_code}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg font-black tracking-tight">MK</span>
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-gray-900 leading-tight">東京エムケイ</p>
              <p className="text-xs text-gray-500">Shuttle Hire</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-7 shadow-sm space-y-5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">予約を確認する</h1>
            <p className="text-xs text-gray-500 mt-1">
              確認番号を入力してQRチケットを表示します
            </p>
          </div>

          {state === 'not_found' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              予約が見つかりませんでした。確認番号をご確認ください。
            </div>
          )}

          {state === 'cancelled' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              この予約はキャンセル済みです。ホテルフロントまでお問い合わせください。
            </div>
          )}

          <form method="GET" action="/lookup" className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-medium text-gray-700 mb-1.5">
                確認番号 / Confirmation Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                defaultValue={trimmed}
                placeholder="例）ABC12345"
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1.5">
                確認番号は予約完了メールに記載されています
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-blue-700 transition"
            >
              チケットを表示
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500">
          お困りの場合はホテルフロントへお申し付けください
        </p>
        <p className="text-center text-xs text-gray-300">© 東京エムケイ株式会社</p>
      </div>
    </div>
  )
}
