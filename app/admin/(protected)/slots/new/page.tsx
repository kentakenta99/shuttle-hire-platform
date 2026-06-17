import Link from 'next/link'
import SlotNewForm from './SlotNewForm'

export default function SlotNewPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/slots" className="text-sm text-blue-600 hover:underline">← 出発枠一覧</Link>
      </div>
      <h1 className="text-lg font-bold text-gray-900">出発枠を作成</h1>
      <SlotNewForm />
    </div>
  )
}
