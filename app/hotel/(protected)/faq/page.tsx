'use client'

import { useState } from 'react'
import Link from 'next/link'

type Item = { q: string; a: string }
type Section = { title: string; items: Item[] }

const SECTIONS: Section[] = [
  {
    title: '予約の基本操作',
    items: [
      {
        q: '予約の流れを教えてください',
        a: '① ナビの「空き枠」から便を選ぶ → ② 予約フォームにゲスト情報を入力 → ③「予約を確定する」を押す。確定後は予約詳細ページに QR コードが表示されます。',
      },
      {
        q: 'ゲストからリクエストが届いた場合は？',
        a: 'ナビの「リクエスト」に件数バッジが表示されます。リクエスト一覧で内容を確認し、「確定する」から便を選ぶと予約に変換されます。ゲストのメールアドレスが登録されていれば QR チケットが自動送信されます。',
      },
      {
        q: 'ゲストに QR コードを渡す方法は？',
        a: '予約詳細ページの QR コードをゲストのスマートフォンでスキャンしてもらうか、確認番号（英数字）を口頭でお伝えください。ゲストのメールアドレスを入力した場合は乗車案内メールも自動送信されます。',
      },
      {
        q: '担当スタッフ名を記録できますか？',
        a: '予約フォームの「担当スタッフ名」欄に入力すると予約詳細に記録されます。任意項目です。',
      },
    ],
  },
  {
    title: 'キャンセル・変更',
    items: [
      {
        q: 'キャンセルできる期限はいつですか？',
        a: '各便の「締切時刻」まではシステムからキャンセルできます。締切後のキャンセルは TMK 配車センターへ直接ご連絡ください。',
      },
      {
        q: 'キャンセルするとゲストにメールが届きますか？',
        a: '予約時にゲストのメールアドレスが登録されている場合、キャンセル通知メールが自動送信されます。理由を入力すると本文に記載されます。',
      },
      {
        q: 'キャンセル後の料金はどうなりますか？',
        a: 'ホテル請求（月末まとめ払い）の場合、キャンセルされた予約は月末請求書から自動除外されます。車内決済の場合は返金手続き不要です（予約詳細のキャンセル画面にも表示されます）。',
      },
      {
        q: '予約内容を変更したい場合は？',
        a: 'システム上での変更機能はありません。一度キャンセルし、新しい内容で再度予約してください。',
      },
    ],
  },
  {
    title: 'メール・QR',
    items: [
      {
        q: 'ゲストにメールが届く条件は？',
        a: '予約時またはリクエスト確定時に「ゲストのメールアドレス」欄にアドレスが入力されている場合のみ自動送信されます。入力がない場合はメールは送信されません。',
      },
      {
        q: 'メールが届かないとゲストから言われたら？',
        a: '① 迷惑メールフォルダを確認してもらう ② 予約詳細ページの QR コードを直接スキャンしてもらう ③ 確認番号を口頭でお伝えし、ゲストが自分で QR を表示できます（乗車確認ページ URL: /confirm/確認番号）。',
      },
      {
        q: 'QR コードはどこで使いますか？',
        a: 'ドライバーが乗車時にゲストの QR コードをスキャンして乗車確認します。ゲストはスマートフォンで QR を表示するか、口頭で確認番号をドライバーにお伝えください。',
      },
    ],
  },
  {
    title: '料金・請求',
    items: [
      {
        q: 'ホテル請求と車内決済の違いは？',
        a: '「ホテル請求」はご利用分を月末にホテルへまとめて請求します。「車内決済」はゲストがドライバーに直接お支払いいただくため、ホテルへの請求は発生しません。契約内容によりいずれかに設定されています。',
      },
      {
        q: '料金はどこで確認できますか？',
        a: '車内決済の場合は予約フォームの人数選択時に1名あたりの料金が表示されます。ホテル請求の場合は料金表示はなく、月末の請求書でご確認いただけます。',
      },
    ],
  },
  {
    title: 'トラブル・緊急時',
    items: [
      {
        q: '満席で予約できない場合は？',
        a: '「空き枠一覧」で別の時間帯・日付の便をお探しください。緊急の場合は TMK 配車センターへ直接ご連絡ください。',
      },
      {
        q: 'システムにエラーが出て操作できない場合は？',
        a: 'ブラウザをリロード（再読み込み）してお試しください。改善しない場合は TMK 配車センターまでご連絡ください。',
      },
      {
        q: '緊急連絡先はどこですか？',
        a: 'TMK 配車センター（東京エムケイ）へご連絡ください。連絡先はホテルフロントに配布済みの運用マニュアルをご参照ください。',
      },
    ],
  },
]

function FaqItem({ q, a }: Item) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex items-start justify-between gap-3 px-4 py-4"
      >
        <span className="text-sm font-medium text-gray-800 leading-snug">{q}</span>
        <span className={`text-gray-400 text-lg leading-none shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <div>
      <div className="mb-4">
        <Link href="/hotel/calendar" className="text-blue-600 text-sm hover:underline">← 空き枠一覧</Link>
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">よくある質問</h1>
      <div className="space-y-5">
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section.title}</h2>
            </div>
            {section.items.map(item => (
              <FaqItem key={item.q} {...item} />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-8">
        解決しない場合は TMK 配車センターへご連絡ください
      </p>
    </div>
  )
}
