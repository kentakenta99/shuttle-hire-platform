'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FlightSuggestion } from '@/app/api/validate-flight/route'

type ValidationResult = {
  exact: FlightSuggestion | null
  suggestions: FlightSuggestion[]
}

type Props = {
  name: string
  required?: boolean
  placeholder?: string
  date?: string        // YYYY-MM-DD（希望日）
  className?: string
  defaultValue?: string
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('ja-JP', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo',
    })
  } catch { return '' }
}

export default function FlightNumberInput({
  name, required, placeholder, date, className, defaultValue = '',
}: Props) {
  const [value, setValue]   = useState(defaultValue)
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'suggest' | 'notfound'>('idle')
  const [result, setResult] = useState<ValidationResult | null>(null)
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
      if (data.exact)                    setStatus('ok')
      else if (data.suggestions.length)  setStatus('suggest')
      else                               setStatus('notfound')
    } catch {
      setStatus('idle')
    }
  }, [date])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value.trim()) { setStatus('idle'); setResult(null); return }
    timerRef.current = setTimeout(() => validate(value), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, validate])

  const selectSuggestion = (s: FlightSuggestion) => {
    setValue(s.iata)
    setResult({ exact: s, suggestions: [] })
    setStatus('ok')
  }

  return (
    <div>
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
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

      {/* 候補あり */}
      {status === 'suggest' && result && result.suggestions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs font-medium text-amber-700">もしかしてこちらの便ですか？</p>
          {result.suggestions.map(s => (
            <button
              key={s.iata}
              type="button"
              onClick={() => selectSuggestion(s)}
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
          ))}
        </div>
      )}

      {/* 見つからず */}
      {status === 'notfound' && (
        <p className="mt-2 text-xs text-red-500">
          この便は見つかりませんでした。フライト番号をご確認ください（例：NH832）。
        </p>
      )}
    </div>
  )
}
