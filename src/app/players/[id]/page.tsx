import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { prisma } from '@/lib/db'
import { WagonWheel, Shot } from '@/components/live/WagonWheel'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params

  const player = await prisma.player.findUnique({
    where: { id },
  })

  if (!player) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-[#09090B]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="text-base font-black uppercase tracking-wider text-black">Player Not Found</h2>
          <Link href="/players" className="inline-block bg-black px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors shadow-sm">
            Back to Directory
          </Link>
        </div>
      </div>
    )
  }

  // Aggregate batting figures
  const battingEvents = await prisma.ballEvent.findMany({
    where: { strikerId: id, isUndone: false },
    orderBy: { createdAt: 'desc' },
  })

  // Aggregate bowling figures
  const bowlingEvents = await prisma.ballEvent.findMany({
    where: { bowlerId: id, isUndone: false },
  })

  const totalRuns = battingEvents.reduce((sum: number, e: any) => sum + e.runsOffBat, 0)
  const ballsFaced = battingEvents.filter((e: any) => e.extraType !== 'WIDE').length
  const fours = battingEvents.filter((e: any) => e.runsOffBat === 4).length
  const sixes = battingEvents.filter((e: any) => e.runsOffBat === 6).length
  const strikeRate = ballsFaced > 0 ? (totalRuns / ballsFaced) * 100 : 0

  const dismissals = await prisma.ballEvent.count({
    where: { dismissedPlayerId: id, isUndone: false },
  })
  const battingAverage = dismissals > 0 ? totalRuns / dismissals : totalRuns

  const wicketsTaken = bowlingEvents.filter(
    (e: any) => e.isWicket && e.wicketType !== 'RUN_OUT' && e.wicketType !== 'RETIRED'
  ).length
  const legalBowlingBalls = bowlingEvents.filter(
    (e: any) => e.extraType !== 'WIDE' && e.extraType !== 'NO_BALL'
  ).length
  const runsConceded = bowlingEvents.reduce((sum: number, e: any) => {
    if (e.extraType === 'WIDE') return sum + 1 + e.extras
    if (e.extraType === 'NO_BALL') return sum + 1 + e.runsOffBat
    if (e.extraType === 'BYE' || e.extraType === 'LEG_BYE') return sum
    return sum + e.runsOffBat
  }, 0)
  const bowlingEconomy = legalBowlingBalls > 0 ? runsConceded / (legalBowlingBalls / 6) : 0

  const shots: Shot[] = battingEvents
    .filter((e: any) => e.shotX !== null && e.shotY !== null)
    .map((e: any) => ({ x: e.shotX!, y: e.shotY!, runs: e.runsOffBat, zone: e.shotZone }))

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#001838] flex items-center justify-center font-bold text-white text-2xl shadow-sm">
              {player.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#001838] tracking-tight">{player.name}</h1>
              <p className="text-xs text-slate-500 font-light uppercase tracking-wider">
                {player.battingStyle ? player.battingStyle.replace(/_/g, ' ') : 'RIGHT HAND BAT'} • {player.bowlingStyle ? player.bowlingStyle.replace(/_/g, ' ') : 'ALL ROUNDER'}
              </p>
            </div>
          </div>

          <Link
            href="/players"
            className="text-xs font-medium uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl border border-slate-200 self-start sm:self-center transition-colors"
          >
            ← Player Directory
          </Link>
        </div>

        {/* Career Numbers Grid (Stumps App Style with Prominent Big Numbers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Career Runs</div>
            <div className="text-4xl sm:text-5xl font-bold font-sans text-[#001838] tracking-tight">{totalRuns}</div>
            <div className="text-xs text-slate-500 font-mono font-light">{ballsFaced} balls faced</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Strike Rate</div>
            <div className="text-4xl sm:text-5xl font-bold font-sans text-[#0066CC] tracking-tight">{strikeRate.toFixed(1)}</div>
            <div className="text-xs text-slate-500 font-mono font-light">Avg: {battingAverage.toFixed(1)}</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Boundaries</div>
            <div className="text-4xl sm:text-5xl font-bold font-sans text-amber-600 tracking-tight">{fours + sixes}</div>
            <div className="text-xs text-slate-500 font-mono font-light">{fours}x4 • {sixes}x6</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Wickets Taken</div>
            <div className="text-4xl sm:text-5xl font-bold font-sans text-emerald-600 tracking-tight">{wicketsTaken}</div>
            <div className="text-xs text-slate-500 font-mono font-light">Econ: {bowlingEconomy.toFixed(2)}</div>
          </div>
        </div>

        {/* Wagon Wheel & Recent Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wagon Wheel */}
          <div className="space-y-3">
            <WagonWheel shots={shots} />
          </div>

          {/* Recent Delivery Log */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#001838] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001838]"></span>
              Recent Deliveries Faced
            </h2>

            {battingEvents.length === 0 ? (
              <div className="text-xs text-slate-400 py-12 text-center font-light">No deliveries logged for this player yet.</div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {battingEvents.slice(0, 15).map((e: any) => (
                  <div
                    key={e.id}
                    className="flex justify-between items-center bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-500 text-[11px]">Ov {e.overNumber}.{e.ballInOver}</span>
                      <span className="font-medium text-[#001838]">
                        {e.runsOffBat === 4 ? 'Boundary (4)' : e.runsOffBat === 6 ? 'Maximum (6)' : `${e.runsOffBat} run(s)`}
                      </span>
                      {e.extraType !== 'NONE' && (
                        <span className="text-[9px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono uppercase font-medium">
                          {e.extraType}
                        </span>
                      )}
                    </div>
                    {e.shotZone && (
                      <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-slate-200">
                        {e.shotZone.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}



