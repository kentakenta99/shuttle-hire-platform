import { NextRequest, NextResponse } from 'next/server'
import { getNrtTerminalFromFlight } from '@/lib/nrt-terminals'

export type FlightSuggestion = {
  iata: string
  airline: string
  terminal: string | null
  dest: string
  scheduledDep: string | null  // ISO 8601
}

type AviationFlight = {
  flight_status: string
  departure: {
    iata: string
    terminal: string | null
    scheduled: string | null
    estimated: string | null
  }
  arrival: {
    airport: string
    iata: string
  }
  airline: { name: string; iata: string }
  flight: { iata: string; number: string }
}

function toSuggestion(f: AviationFlight): FlightSuggestion {
  const flightIata = f.flight.iata.toUpperCase()
  const terminal = f.departure.terminal ?? getNrtTerminalFromFlight(flightIata)
  return {
    iata:         flightIata,
    airline:      f.airline.name,
    terminal,
    dest:         f.arrival.airport,
    scheduledDep: f.departure.estimated ?? f.departure.scheduled ?? null,
  }
}

async function searchAviationStack(params: URLSearchParams): Promise<AviationFlight[]> {
  const key = process.env.AVIATIONSTACK_API_KEY
  if (!key) return []
  params.set('access_key', key)
  // 無料プランはHTTPのみ
  const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []) as AviationFlight[]
}

export async function GET(req: NextRequest) {
  const raw   = req.nextUrl.searchParams.get('q') ?? ''
  const date  = req.nextUrl.searchParams.get('date') ?? ''
  const q     = raw.replace(/\s+/g, '').toUpperCase()

  if (q.length < 3) {
    return NextResponse.json({ exact: null, suggestions: [] })
  }

  // ステップ1: 成田発で完全一致
  const p1 = new URLSearchParams({ flight_iata: q, dep_iata: 'NRT', limit: '5' })
  if (date) p1.set('flight_date', date)
  let flights = await searchAviationStack(p1)

  // ステップ2: 成田限定で見つからない場合、成田制限なしで再試行（コードシェア等考慮）
  if (flights.length === 0) {
    const p2 = new URLSearchParams({ flight_iata: q, limit: '5' })
    if (date) p2.set('flight_date', date)
    flights = await searchAviationStack(p2)
  }

  if (flights.length > 0) {
    return NextResponse.json({ exact: toSuggestion(flights[0]), suggestions: [] })
  }

  // ステップ3: 候補検索（同一キャリア・成田発で近い番号）
  const carrierMatch = q.match(/^([A-Z]{2,3})(\d+)$/)
  if (!carrierMatch) {
    return NextResponse.json({ exact: null, suggestions: [] })
  }

  const [, airlineCode, flightNum] = carrierMatch
  const targetNum = parseInt(flightNum, 10)

  const p3 = new URLSearchParams({ airline_iata: airlineCode, dep_iata: 'NRT', limit: '100' })
  if (date) p3.set('flight_date', date)
  const candidates = await searchAviationStack(p3)

  const suggestions = candidates
    .filter(f => {
      const num = parseInt(f.flight.number, 10)
      return !isNaN(num) && Math.abs(num - targetNum) <= 100
    })
    .sort((a, b) => {
      const da = Math.abs(parseInt(a.flight.number, 10) - targetNum)
      const db = Math.abs(parseInt(b.flight.number, 10) - targetNum)
      return da - db
    })
    .slice(0, 3)
    .map(toSuggestion)

  return NextResponse.json({ exact: null, suggestions })
}
