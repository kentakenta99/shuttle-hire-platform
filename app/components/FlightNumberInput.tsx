'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FlightSuggestion } from '@/app/api/validate-flight/route'

type ValidationResult = {
  exact: FlightSuggestion | null
  suggestions: FlightSuggestion[]
}

type SearchResult = {
  suggestions: FlightSuggestion[]
}

// 航空会社名 → IATAコード（入力補助用）
const AIRLINE_NAME_MAP: Record<string, string> = {
  ANA: 'NH', JAL: 'JL', UNITED: 'UA', DELTA: 'DL',
  LUFTHANSA: 'LH', SINGAPORE: 'SQ', CATHAY: 'CX', EMIRATES: 'EK',
  QATAR: 'QR', THAI: 'TG', ASIANA: 'OZ', KOREAN: 'KE',
  AIRCANADA: 'AC', 'AIR CANADA': 'AC',
  'CHINA AIRLINES': 'CI', EVA: 'BR', PEACH: 'MM',
  JETSTAR: 'GK', SCOOT: 'TR', AIRFRANCE: 'AF', 'AIR FRANCE': 'AF',
  KLM: 'KL', BRITISH: 'BA', AMERICAN: 'AA',
}

function resolveAirlineCode(input: string): string {
  const up = input.trim().toUpperCase()
  return AIRLINE_NAME_MAP[up] ?? up
}

type Props = {
  name: string
  required?: boolean
  placeholder?: string
  date?: string
  className?: string
  defaultValue?: string
}

function formatTime(iso: string | null): string {
  if (!iso || iso.length < 16) return ''
  // AviationStack 無料プランはローカル出発時刻を UTC として誤ラベリングするため
  // タイムゾーン変換せずに ISO 文字列から時刻を直接取得する
  return iso.substring(11, 16)
}

function SuggestionCard({
  s,
  onClick,
}: {
  s: FlightSuggestion
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 hover:bg-amber-100 active:scale-[0.99] transition"
    >
      <span className="font-bold text-gray-900">{s.iata}</span>
      <span className="text-gray-500 ml-2">
        {s.airline}
        {s.terminal && ` 第${s.terminal}ターミナル`}
        {s.scheduledDep && ` ${formatTime(s.scheduledDep)}発`}
        {s.dest && ` → ${s.dest}`}
      </span>
    </button>
  )
}

const TIME_RANGES = [
  { key: 'morning',   label: '午前', sub: '6〜12時' },
  { key: 'afternoon', label: '午後', sub: '12〜18時' },
  { key: 'evening',   label: '夕方以降', sub: '18時〜' },
] as const

export default function FlightNumberInput({
  name, required, placeholder, date, className, defaultValue = '',
}: Props) {
  const [value, setValue]       = useState(defaultValue)
  const [status, setStatus]     = useState<'idle' | 'checking' | 'ok' | 'suggest' | 'notfound'>('idle')
  const [result, setResult]     = useState<ValidationResult | null>(null)
  const [lazyOpen, setLazyOpen] = useState(false)

  // lazy search state
  const [lazyAirline,   setLazyAirline]   = useState('')
  const [lazyMode,      setLazyMode]      = useState<'time' | 'dest'>('time')
  const [lazyTimeRange, setLazyTimeRange] = useState<string>('')
  const [lazyDest,      setLazyDest]      = useState('')
  const [lazyResults,   setLazyResults]   = useState<FlightSuggestion[]>([])
  const [lazySearching, setLazySearching] = useState(false)
  const [lazySearched,  setLazySearched]  = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validate = useCallback(async (val: string) => {
    const q = val.replace(/\s+/g, '').toUpperCase()
    if (q.length < 3) { setStatus('idle'); setResult(null); return }

    setStatus('checking')
    try {
      const params = new URLSearchParams({ q })
      if (date) params.set('date', date)
      const res = await fetch(`/api/validate-flight?${params}`)
      const data: ValidationResult = await res.json()
      setResult(data)
      if (data.exact)                   setStatus('ok')
      else if (data.suggestions.length) setStatus('suggest')
      else                              setStatus('notfound')
    } catch {
      setStatus('idle')
    }
  }, [date])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- デバウンスのアーリーリターンパターン。意図的
    if (!value.trim()) { setStatus('idle'); setResult(null); return }
    timerRef.current = setTimeout(() => validate(value), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, validate])

  const selectSuggestion = (s: FlightSuggestion) => {
    setValue(s.iata)
    setResult({ exact: s, suggestions: [] })
    setStatus('ok')
    setLazyOpen(false)
    setLazyResults([])
  }

  const handleLazySearch = async () => {
    const airlineCode = resolveAirlineCode(lazyAirline)
    if (!airlineCode) return
    if (lazyMode === 'dest' && !lazyDest.trim()) return
    if (lazyMode === 'time' && !lazyTimeRange) return

    setLazySearching(true)
    setLazySearched(false)
    setLazyResults([])
    try {
      const params = new URLSearchParams({ airline: airlineCode })
      if (date) params.set('date', date)
      if (lazyMode === 'time') params.set('timeRange', lazyTimeRange)
      else                     params.set('dest', lazyDest.trim().toUpperCase())

      const res = await fetch(`/api/search-flights?${params}`)
      const data: SearchResult = await res.json()
      setLazyResults(data.suggestions ?? [])
    } catch {
      setLazyResults([])
    } finally {
      setLazySearching(false)
      setLazySearched(true)
    }
  }

  const canSearch =
    lazyAirline.trim().length >= 2 &&
    (lazyMode === 'time' ? !!lazyTimeRange : lazyDest.trim().length >= 2)

  return (
    <div>
      {/* フライト番号入力 */}
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={e => setValue(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
        />
        {status === 'checking' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">
            確認中…
          </span>
        )}
      </div>

      {/* 確認OK */}
      {status === 'ok' && result?.exact && (
        <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-green-600 shrink-0 mt-px">✓</span>
          <p className="text-xs text-green-800 leading-relaxed">
            <span className="font-bold">{result.exact.iata}</span>
            {' '}（{result.exact.airline}）
            {result.exact.terminal && (
              <span className="ml-1 font-semibold">第{result.exact.terminal}ターミナル発</span>
            )}
            {result.exact.scheduledDep && (
              <span className="ml-1">{formatTime(result.exact.scheduledDep)} 発</span>
            )}
            {result.exact.dest && (
              <span className="text-green-600 ml-1">→ {result.exact.dest}</span>
            )}
          </p>
        </div>
      )}

      {/* 候補あり（フライト番号間違い） */}
      {status === 'suggest' && result && result.suggestions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs font-medium text-amber-700">もしかしてこちらの便ですか？</p>
          {result.suggestions.map(s => (
            <SuggestionCard key={s.iata} s={s} onClick={() => selectSuggestion(s)} />
          ))}
        </div>
      )}

      {/* 見つからず */}
      {status === 'notfound' && (
        <p className="mt-2 text-xs text-red-500">
          この便は見つかりませんでした。フライト番号をご確認ください（例：NH832）。
        </p>
      )}

      {/* ---- Lazy検索パネル ---- */}
      <button
        type="button"
        onClick={() => setLazyOpen(v => !v)}
        className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline underline-offset-2 transition"
      >
        {lazyOpen ? '▲ 閉じる' : 'Are you too lazy to check your flight number? →'}
      </button>

      {lazyOpen && (
        <div className="mt-2 border border-dashed border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <p className="text-xs text-gray-500 leading-relaxed">
            エアライン＋出発時間帯か目的地を教えてください。該当便を表示します。
          </p>

          {/* エアライン入力 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Airline</label>
            <input
              type="text"
              value={lazyAirline}
              onChange={e => { setLazyAirline(e.target.value); setLazySearched(false) }}
              placeholder="NH / ANA / JL / JAL..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* モード切替 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setLazyMode('time'); setLazySearched(false) }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                lazyMode === 'time'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              出発時間帯で探す
            </button>
            <button
              type="button"
              onClick={() => { setLazyMode('dest'); setLazySearched(false) }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                lazyMode === 'dest'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              目的地で探す
            </button>
          </div>

          {/* 時間帯選択 */}
          {lazyMode === 'time' && (
            <div className="grid grid-cols-3 gap-2">
              {TIME_RANGES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setLazyTimeRange(t.key); setLazySearched(false) }}
                  className={`py-2 rounded-lg border text-center transition ${
                    lazyTimeRange === t.key
                      ? 'bg-[#C9A227] border-[#C9A227] text-black'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[10px] text-current opacity-70">{t.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* 目的地入力 */}
          {lazyMode === 'dest' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Destination</label>
              <input
                type="text"
                value={lazyDest}
                onChange={e => { setLazyDest(e.target.value); setLazySearched(false) }}
                placeholder="BKK / Bangkok / LHR / London..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          )}

          {/* 検索ボタン */}
          <button
            type="button"
            onClick={handleLazySearch}
            disabled={!canSearch || lazySearching}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-40"
          >
            {lazySearching ? '検索中...' : '便を探す'}
          </button>

          {/* 検索結果 */}
          {lazySearched && (
            lazyResults.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-600">
                  {lazyResults.length}件見つかりました — タップして選択
                </p>
                {lazyResults.map(s => (
                  <SuggestionCard key={s.iata} s={s} onClick={() => selectSuggestion(s)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-1">
                該当する便が見つかりませんでした。条件を変えてお試しください。
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}
