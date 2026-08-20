'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Radio, Users } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Matches', icon: Radio },
    { href: '/players', label: 'Players', icon: Users },
  ]

  return (
    <header className="sticky top-0 z-40 bg-[#001838] border-b border-[#0A2540] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0066CC] flex items-center justify-center text-white font-medium text-xs">
            CE
          </div>
          <div>
            <div className="text-sm font-medium tracking-wide text-white">
              CricEngine
            </div>
            <span className="text-[11px] text-slate-300 font-light block">
              Cricket Match Scorer Tool
            </span>
          </div>
        </Link>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {links.map((link) => {
              const isActive = pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#0066CC] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <Link
            href="/matches/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-medium transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Match</span>
          </Link>
        </div>
      </div>
    </header>
  )
}




