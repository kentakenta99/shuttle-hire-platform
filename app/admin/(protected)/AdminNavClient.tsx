'use client'

import { useState } from 'react'
import Link from 'next/link'

type NavItem = { href: string; label: string }

export default function AdminNavClient({
  items,
  displayName,
}: {
  items: NavItem[]
  displayName: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex gap-0.5">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 rounded text-sm text-zinc-400 hover:text-[#C9A227] hover:bg-white/5 transition whitespace-nowrap"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile: user label + hamburger */}
      <div className="flex md:hidden items-center gap-3">
        <span className="text-xs text-[#C9A227]/60 truncate max-w-[120px]">{displayName}</span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="p-2 rounded text-zinc-400 hover:text-[#C9A227] hover:bg-white/5 transition"
          aria-label="メニューを開く"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-black border-t border-[#C9A227]/20 z-50 shadow-xl">
          <nav className="flex flex-col py-2">
            {items.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="px-5 py-3 text-sm text-zinc-400 hover:text-[#C9A227] hover:bg-white/5 transition"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
