'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Radio, Trophy, Users } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Matches', icon: Radio },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/players', label: 'Players', icon: Users },
  ]

  return (
    <header className="sticky top-0 z-40 bg-[#001838] border-b border-[#0A2540] shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0066CC] flex items-center justify-center text-white font-medium text-xs">
            CE
          </div>
          <div className="hidden min-[400px]:block">
            <div className="text-sm font-medium tracking-wide text-white">
              CricEngine
            </div>
            <span className="text-[11px] text-slate-300 font-light hidden sm:block">
              Cricket Match Scorer Tool
            </span>
          </div>
        </Link>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {links.map((link) => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#0066CC] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className={isActive ? 'inline' : 'hidden md:inline'}>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <Link
            href="/matches/new"
            aria-label="New Match"
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-medium transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Match</span>
          </Link>
        </div>
      </div>
    </header>
  )
}




