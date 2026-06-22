import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | 東京エムケイ シャトルハイヤー',
}

type Section = { title: string; content: React.ReactNode }

const sections: Section[] = [
  {
    title: '1. 事業者情報',
    content: (
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {[
            ['サービス名', '東京エムケイ シャトルハイヤー予約システム'],
            ['運営会社', '東京エムケイ株式会社'],
            ['運営委託会社', 'ウィッシュボーンLLパートナーズ'],
            ['お問い合わせ', 'shuttle@tokyomk.com（準備中）'],
          ].map(([label, value]) => (
            <tr key={label}>
              <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap w-36">{label}</td>
              <td className="py-2.5 text-gray-800">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    title: '2. 収集する個人情報',
    content: (
      <ul className="space-y-1.5 text-sm text-gray-600">
        {[
          'お客様のお名前',
          '客室番号',
          '人数・お荷物の個数',
          'フライト番号',
          'ご希望の出発日・時刻',
          'メールアドレス（任意）',
          'IPアドレス（不正利用防止のため自動取得）',
        ].map(item => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: '3. 利用目的',
    content: (
      <ul className="space-y-1.5 text-sm text-gray-600">
        {[
          'シャトルハイヤー予約の受付・確定・管理',
          'QRチケットおよび乗車案内メールの送信',
          'キャンセル・変更に関するご連絡',
          '予約確認・乗車確認のためのドライバーへの情報提供',
          'ホテルへの月次請求書の作成',
          '不正予約の検知および防止',
        ].map(item => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: '4. 第三者への提供',
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        お客様の個人情報は、以下の場合を除き、第三者に提供しません。
        <br /><br />
        <strong className="text-gray-800">サービス提供に必要な委託先への提供：</strong><br />
        乗車担当ドライバーへの氏名・人数・フライト番号の提供、
        メール送信サービス（Resend Inc.）への必要最小限の情報提供。
        いずれも本サービス提供の目的のみに使用します。
        <br /><br />
        <strong className="text-gray-800">法令に基づく場合：</strong><br />
        法令の定めに従い、公的機関から適法な要求があった場合。
      </p>
    ),
  },
  {
    title: '5. データの保管・処理',
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        本サービスは以下の外部サービスを利用しています。お客様のデータはこれらのサービスのサーバー（海外を含む）で処理・保管される場合があります。
        <br /><br />
        <strong className="text-gray-800">Supabase（データベース）：</strong> Supabase, Inc.（米国）<br />
        <strong className="text-gray-800">Vercel（サーバーホスティング）：</strong> Vercel Inc.（米国）<br />
        <strong className="text-gray-800">Resend（メール送信）：</strong> Resend Inc.（米国）
      </p>
    ),
  },
  {
    title: '6. 保存期間',
    content: (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="py-2 px-3 text-left text-gray-500 font-medium text-xs">データ種別</th>
            <th className="py-2 px-3 text-left text-gray-500 font-medium text-xs">保持期間</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {([
            ['予約情報（氏名・フライト・人数等）', '乗車日から2年'],
            ['メールアドレス', '乗車完了から6ヶ月後に削除'],
            ['IPアドレス', '予約申請から1年'],
            ['キャンセル認証コード（OTP）', '有効期限（10分）から24時間後に自動削除'],
            ['アクセスログ', '90日（プラットフォーム自動削除）'],
          ] as [string, string][]).map(([label, period]) => (
            <tr key={label}>
              <td className="py-2.5 px-3 text-gray-700">{label}</td>
              <td className="py-2.5 px-3 text-gray-500">{period}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    title: '7. 安全管理措置',
    content: (
      <ul className="space-y-1.5 text-sm text-gray-600">
        {[
          '全通信を HTTPS（TLS）で暗号化',
          'データベースへのアクセスはロールベースのアクセス制御（RLS）で保護',
          'APIキー・認証情報は環境変数で管理し、コードに含めない',
          '予約キャンセルにはメール認証（OTP）を必須とし、第三者による不正キャンセルを防止',
          '不正予約検知のためIPアドレスに基づくレートリミットを実施',
          'アクセスログを記録し、不審なアクセスを検知・ブロック',
        ].map(item => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: '8. お客様の権利',
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        お客様はご自身の個人情報について、開示・訂正・削除・利用停止を請求する権利があります。
        ご希望の場合は下記お問い合わせ先までご連絡ください。本人確認のうえ、合理的な期間内に対応いたします。
      </p>
    ),
  },
  {
    title: '9. Cookie・アクセス解析',
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        本サービスは認証セッションの維持のために Cookie を使用します。
        広告目的のトラッキング Cookie は使用していません。
      </p>
    ),
  },
  {
    title: '10. ポリシーの変更',
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        本ポリシーは必要に応じて改定する場合があります。重要な変更がある場合は、本ページ上でお知らせします。
        継続してサービスをご利用いただいた場合、改定後のポリシーに同意いただいたものとみなします。
      </p>
    ),
  },
  {
    title: '11. お問い合わせ',
    content: (
      <div className="text-sm text-gray-600 space-y-1">
        <p>個人情報の取り扱いに関するお問い合わせは以下までご連絡ください。</p>
        <p className="mt-3">
          <strong className="text-gray-800">東京エムケイ株式会社</strong>（運営会社）<br />
          委託先：ウィッシュボーンLLパートナーズ<br />
          Email：shuttle@tokyomk.com（準備中）
        </p>
      </div>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* ヘッダー */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            東京エムケイ シャトルハイヤー
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">プライバシーポリシー</h1>
          <p className="text-sm text-gray-400">制定：2026年6月　最終更新：2026年6月</p>
        </div>

        {/* 本文 */}
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">{section.title}</h2>
              {section.content}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className="mt-10 text-center">
          <Link
            href="javascript:history.back()"
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            ← 前のページに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
