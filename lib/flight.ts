export type FlightInfo = {
  flightNumber:        string
  scheduledDeparture:  string | null  // ISO 8601
  estimatedDeparture:  string | null
  status:              string | null  // "scheduled" | "active" | "landed" | "cancelled" | "incident" | "diverted"
  airline:             string | null
  delayMinutes:        number | null
}

/**
 * AviationStack API でフライト情報を取得する。
 * AVIATIONSTACK_API_KEY が未設定の場合は null を返す（graceful degradation）。
 * 結果は Next.js fetch キャッシュで 5 分間保持する。
 */
export async function fetchFlightInfo(
  flightNumber: string,
  date: string   // YYYY-MM-DD (JST)
): Promise<FlightInfo | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY
  if (!apiKey) return null

  const iata = flightNumber.replace(/\s+/g, '').toUpperCase()
  if (!iata || iata.length < 3) return null

  try {
    const url = new URL('https://api.aviationstack.com/v1/flights')
    url.searchParams.set('access_key', apiKey)
    url.searchParams.set('flight_iata', iata)
    url.searchParams.set('flight_date', date)
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), { next: { revalidate: 300 } })
    if (!res.ok) return null

    const json = await res.json()
    const f = json.data?.[0]
    if (!f) return null

    const scheduled  = f.departure?.scheduled  ?? null
    const estimated  = f.departure?.estimated  ?? null
    let delayMinutes: number | null = null
    if (scheduled && estimated) {
      const diff = Math.round((new Date(estimated).getTime() - new Date(scheduled).getTime()) / 60_000)
      if (diff > 5) delayMinutes = diff
    }

    return {
      flightNumber:       iata,
      scheduledDeparture: scheduled,
      estimatedDeparture: estimated,
      status:             f.flight_status ?? null,
      airline:            f.airline?.name  ?? null,
      delayMinutes,
    }
  } catch {
    return null
  }
}
