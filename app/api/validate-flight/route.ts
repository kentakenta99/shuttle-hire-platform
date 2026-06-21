import { NextRequest, NextResponse } from 'next/server'
import { getNrtTerminalFromFlight } from '@/lib/nrt-terminals'

export type FlightSuggestion = {
  iata: string
  airline: string
  terminal: string | null
  dest: string
  scheduledDep: string | null
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

// flight_date は AviationStack 無料プランで非対応のため使用しない
async function fetchAirlineFlights(airlineCode: string): Promise<AviationFlight[]> {
  const key = process.env.AVIATIONSTACK_API_KEY
  if (!key) return []

  const params = new URLSearchParams({
    access_key:   key,
    airline_iata: airlineCode,
    dep_iata:     'NRT',
    limit:        '100',
  })

  try {
    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const json = await res.json()
    if (json.error) return []
    return (json.data ?? []) as AviationFlight[]
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? ''
  const q   = raw.replace(/\s+/g, '').toUpperCase()

  if (q.length < 3) {
    return NextResponse.json({ exact: null, suggestions: [] })
  }

  const match = q.match(/^([A-Z]{2,3})(\d+)$/)
  if (!match) {
    return NextResponse.json({ exact: null, suggestions: [] })
  }

  const [, airlineCode, flightNumStr] = match
  const targetNum = parseInt(flightNumStr, 10)

  const flights = await fetchAirlineFlights(airlineCode)

  // 完全一致を探す
  const exact = flights.find(f => parseInt(f.flight.number, 10) === targetNum)
  if (exact) {
    return NextResponse.json({ exact: toSuggestion(exact), suggestions: [] })
  }

  // 近い番号の候補（±100 以内、最大3件）
  const suggestions = flights
    .filter(f => {
      const num = parseInt(f.flight.number, 10)
      return !isNaN(num) && Math.abs(num - targetNum) <= 100
    })
    .sort((a, b) =>
      Math.abs(parseInt(a.flight.number, 10) - targetNum) -
      Math.abs(parseInt(b.flight.number, 10) - targetNum)
    )
    .slice(0, 3)
    .map(toSuggestion)

  return NextResponse.json({ exact: null, suggestions })
}
