'use client'

import { useEffect, useState } from 'react'

type Props = {
  date: string
  departureTime: string
}

export default function TimeUntilDepartureWarning({ date, departureTime }: Props) {
  const [hoursUntil, setHoursUntil] = useState<number | null>(null)

  useEffect(() => {
    const calculateTime = () => {
      const departureAt = new Date(`${date}T${departureTime}+09:00`)
      const now = new Date()
      const msUntil = departureAt.getTime() - now.getTime()
      const hours = msUntil / (1000 * 60 * 60)
      setHoursUntil(Math.floor(hours * 10) / 10) // 小数第1位まで
    }

    calculateTime()
    const interval = setInterval(calculateTime, 60000) // 1分ごと更新

    return () => clearInterval(interval)
  }, [date, departureTime])

  // 3時間以上の余裕がある場合は表示しない
  if (hoursUntil === null || hoursUntil >= 3) {
    return null
  }

  return (
    <div className="bg-yellow-50 border-t border-yellow-200 px-5 py-3 space-y-2">
      <p className="text-yellow-800 font-semibold text-sm">
        ⚠️ 時間がタイトです
      </p>
      <p className="text-yellow-700 text-xs leading-relaxed">
        このシャトル便だと出発が早く、乗り遅れるリスクがあります。<br />
        <span className="font-semibold">別の便をお選びいただくか、フロントまでお問い合わせください。</span>
      </p>
      <p className="text-yellow-600 text-xs">
        出発まで残り {Math.max(0, Math.floor(hoursUntil))}時間{Math.max(0, Math.round((hoursUntil % 1) * 60))}分
      </p>
    </div>
  )
}
