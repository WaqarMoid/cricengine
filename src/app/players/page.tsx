import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { prisma } from '@/lib/db'
import { Users, Plus, ArrowRight, UserCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlayersDirectoryPage() {
  let players: any[] = []
  try {
    players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            battingEvents: true,
            bowlingEvents: true,
          },
        },
      },
    })
  } catch {
    players = []
  }

  const formatStyle = (style: string | null) => {
    if (!style) return 'All-Rounder'
    return style.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#001838] tracking-tight">
              Player Profiles & Career Records
            </h1>
            <p className="text-xs text-slate-500 font-light">
              Career stats, strike rates, bowling economies, wagon wheels, and performance insights.
            </p>
          </div>

          <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200 self-start sm:self-center">
            {players.length} Players Registered
          </span>
        </div>

        {players.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#001838]">No Registered Players</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
              Create a new match or sample lineup to automatically register player profiles and begin tracking stats.
            </p>
            <Link
              href="/matches/new"
              className="inline-flex items-center gap-1.5 bg-[#0066CC] hover:bg-[#0052A3] text-white font-medium px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Match</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map(player => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="bg-white hover:bg-slate-50/80 rounded-xl p-5 border border-slate-200 hover:border-[#0066CC]/60 transition-all shadow-2xs group block space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#001838] flex items-center justify-center font-bold text-white text-base shadow-2xs">
                    {player.name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-sm text-[#001838] group-hover:text-[#0066CC] transition-colors">
                      {player.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-light">
                      {formatStyle(player.battingStyle)}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-light">
                  <span className="font-mono">{player._count.battingEvents} balls faced</span>
                  <span className="text-[#0066CC] font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                    <span>View Stats</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}



