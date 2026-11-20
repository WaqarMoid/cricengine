import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { listTournaments } from '@/lib/tournament/service'
import { fmtRange } from '@/components/tournament/format'
import { CalendarDays, Crown, MapPin, Plus, Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TournamentsPage() {
  let tournaments: Awaited<ReturnType<typeof listTournaments>> = []
  try {
    tournaments = await listTournaments()
  } catch {
    tournaments = []
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-lg font-semibold text-[#001838]">Tournaments & Series</h1>
            <p className="text-xs text-slate-500 font-light">Group stages, points tables with NRR, knockouts and stat leaders — all computed from ball-by-ball scoring.</p>
          </div>
          <Link href="/tournaments/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-medium self-start sm:self-auto">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tournament</span>
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200 space-y-3">
            <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-medium text-slate-800">No tournaments yet</div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto font-light">Create one, add teams to groups, then schedule matches from “New Match”.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournaments/${t.id}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-[#0066CC]/50 transition-colors block">
                <div className="bg-[#001838] text-white px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-slate-300">{t.shortName} · {t.season}</div>
                    <div className="text-base font-semibold truncate">{t.name}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-200' : t.status === 'LIVE' ? 'bg-red-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                    {t.status === 'IN_PROGRESS' ? 'ONGOING' : t.status}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    {t.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.venue}</span>}
                    {t.startDate && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmtRange(t.startDate, t.endDate)}</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 py-2"><div className="font-mono text-sm font-semibold">{t.teamCount}</div><div className="text-[10px] text-slate-500">Teams</div></div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 py-2"><div className="font-mono text-sm font-semibold">{t.played}/{t.matchCount}</div><div className="text-[10px] text-slate-500">Played</div></div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 py-2"><div className="font-mono text-sm font-semibold">{t.oversPerMatch}</div><div className="text-[10px] text-slate-500">Overs</div></div>
                  </div>
                  {t.champion && (
                    <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-slate-800 min-w-0"><strong className="font-semibold">{t.champion}</strong> won · {t.finalResult}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
