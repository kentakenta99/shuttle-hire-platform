import { NextRequest, NextResponse } from 'next/server'
import { getNrtTerminalFromFlight } from '@/lib/nrt-terminals'
import type { FlightSuggestion } from '@/app/api/validate-flight/route'

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

// 時間帯定義（JST）
const TIME_RANGES: Record<string, { start: number; end: number; label: string }> = {
  morning:   { start: 6,  end: 12, label: '午前（6〜12時）' },
  afternoon: { start: 12, end: 18, label: '午後（12〜18時）' },
  evening:   { start: 18, end: 24, label: '夕方以降（18時〜）' },
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

function scheduledHourJst(iso: string | null): number | null {
  if (!iso) return null
  try {
    const utcMs = new Date(iso).getTime()
    // UTC+9
    return Math.floor((utcMs / 3_600_000 + 9) % 24)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const airline   = searchParams.get('airline')?.toUpperCase().trim()
  const dest      = searchParams.get('dest')?.toUpperCase().trim()
  const timeRange = searchParams.get('timeRange')?.toLowerCase()
  const date      = searchParams.get('date') ?? ''

  if (!airline) {
    return NextResponse.json({ error: 'airline is required', suggestions: [] }, { status: 400 })
  }
  if (!dest && !timeRange) {
    return NextResponse.json({ error: 'dest or timeRange is required', suggestions: [] }, { status: 400 })
  }

  const key = process.env.AVIATIONSTACK_API_KEY
  if (!key) {
    return NextResponse.json({ suggestions: [] })
  }

  const params = new URLSearchParams({
    access_key:   key,
    airline_iata: airline,
    dep_iata:     'NRT',
    limit:        '100',
  })
  if (date) params.set('flight_date', date)
  if (dest) params.set('arr_iata', dest)

  try {
    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return NextResponse.json({ suggestions: [] })

    const json = await res.json()
    let flights: AviationFlight[] = json.data ?? []

    // 時間帯フィルタ（API側にパラメーターがないためクライアント側でフィルタ）
    if (timeRange && TIME_RANGES[timeRange]) {
      const { start, end } = TIME_RANGES[timeRange]
      flights = flights.filter(f => {
        const h = scheduledHourJst(f.departure.scheduled)
        return h !== null && h >= start && h < end
      })
    }

    // フライト番号で重複除去してスケジュール順にソート
    const seen = new Set<string>()
    const unique = flights
      .sort((a, b) => {
        const ta = a.departure.scheduled ?? ''
        const tb = b.departure.scheduled ?? ''
        return ta.localeCompare(tb)
      })
      .filter(f => {
        const key = f.flight.iata.toUpperCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)

    return NextResponse.json({ suggestions: unique.map(toSuggestion) })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
