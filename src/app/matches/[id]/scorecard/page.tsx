import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { prisma } from '@/lib/db'
import { calculateInningsState } from '@/lib/engine/scoring-engine'
import { BallEvent } from '@/lib/engine/types'
import { BattingCard } from '@/components/live/BattingCard'
import { BowlingCard } from '@/components/live/BowlingCard'
import { WagonWheel } from '@/components/live/WagonWheel'
import { ArrowLeft, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchScorecardPage({ params }: PageProps) {
  const { id } = await params

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ballEvents: { orderBy: { sequenceNo: 'asc' } },
    },
  })

  if (!match) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="font-editorial text-xl font-normal text-[#001838]">Scorecard Unavailable</h2>
          <Link href="/" className="inline-block bg-[#001838] px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-white hover:bg-[#0A2540] transition-colors shadow-md">
            Return to Match Centre
          </Link>
        </div>
      </div>
    )
  }

  // Fetch players
  const playerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds]
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
  })
  const playerMap = Object.fromEntries(players.map((p: any) => [p.id, p]))

  // Map events to domain BallEvent
  const events: BallEvent[] = match.ballEvents.map((e: any) => ({
    id: e.id,
    matchId: e.matchId,
    inningsNo: e.inningsNo,
    overNumber: e.overNumber,
    ballInOver: e.ballInOver,
    sequenceNo: e.sequenceNo,
    strikerId: e.strikerId,
    nonStrikerId: e.nonStrikerId,
    bowlerId: e.bowlerId,
    runsOffBat: e.runsOffBat,
    extras: e.extras,
    extraType: e.extraType as BallEvent['extraType'],
    isLegalDelivery: e.isLegalDelivery,
    isWicket: e.isWicket,
    wicketType: e.wicketType as BallEvent['wicketType'],
    dismissedPlayerId: e.dismissedPlayerId,
    fielderId: e.fielderId,
    shotX: e.shotX,
    shotY: e.shotY,
    shotZone: e.shotZone as BallEvent['shotZone'],
    pitchLine: e.pitchLine as BallEvent['pitchLine'],
    pitchLength: e.pitchLength as BallEvent['pitchLength'],
    isUndone: e.isUndone,
    createdAt: e.createdAt.toISOString(),
  }))

  const isTeamABattingFirst = (match.tossWinner === match.teamAName && match.tossDecision === 'BAT') ||
                              (match.tossWinner === match.teamBName && match.tossDecision === 'BOWL')

  const team1Name = isTeamABattingFirst ? match.teamAName : match.teamBName
  const team2Name = isTeamABattingFirst ? match.teamBName : match.teamAName

  const inn1Events = events.filter(e => e.inningsNo === 1)
  const inn2Events = events.filter(e => e.inningsNo === 2)

  const inn1BattersCount = isTeamABattingFirst ? match.teamAPlayerIds.length : match.teamBPlayerIds.length
  const inn2BattersCount = isTeamABattingFirst ? match.teamBPlayerIds.length : match.teamAPlayerIds.length

  const inn1State = calculateInningsState(inn1Events, 1, match.oversLimit, null, inn1BattersCount)
  const target = inn1State.isInningsComplete ? inn1State.totalRuns + 1 : null
  const inn2State = calculateInningsState(inn2Events, 2, match.oversLimit, target, inn2BattersCount)

  const buildBatters = (state: ReturnType<typeof calculateInningsState>, battingIds: string[]) => {
    return battingIds.map(pid => {
      const stats = state.batterStats.get(pid)
      const pInfo = playerMap[pid]
      let howOutStr = ''
      if (stats?.isOut) {
        if (stats.wicketType === 'BOWLED') howOutStr = `b ${playerMap[stats.bowlerIdWhoGotOut!]?.name || 'bowler'}`
        else if (stats.wicketType === 'CAUGHT') howOutStr = `c ${playerMap[stats.fielderIdWhoCaught!]?.name || 'fielder'} b ${playerMap[stats.bowlerIdWhoGotOut!]?.name || 'bowler'}`
        else if (stats.wicketType === 'LBW') howOutStr = `lbw b ${playerMap[stats.bowlerIdWhoGotOut!]?.name || 'bowler'}`
        else if (stats.wicketType === 'RUN_OUT') howOutStr = `run out (${playerMap[stats.fielderIdWhoCaught!]?.name || 'fielder'})`
        else if (stats.wicketType === 'STUMPED') howOutStr = `st ${playerMap[stats.fielderIdWhoCaught!]?.name || 'wk'} b ${playerMap[stats.bowlerIdWhoGotOut!]?.name || 'bowler'}`
        else howOutStr = stats.wicketType?.toLowerCase() || 'out'
      }

      return {
        id: pid,
        name: pInfo?.name || `Player (${pid.slice(0, 4)})`,
        runs: stats?.runs || 0,
        balls: stats?.ballsFaced || 0,
        fours: stats?.fours || 0,
        sixes: stats?.sixes || 0,
        strikeRate: stats?.strikeRate || 0,
        isOut: stats?.isOut || false,
        isOnStrike: false,
        howOut: howOutStr,
      }
    }).filter(b => b.balls > 0 || b.isOut)
  }

  const buildBowlers = (state: ReturnType<typeof calculateInningsState>, fieldingIds: string[]) => {
    return fieldingIds.map(pid => {
      const figures = state.bowlerFigures.get(pid)
      const pInfo = playerMap[pid]

      return {
        id: pid,
        name: pInfo?.name || `Player (${pid.slice(0, 4)})`,
        overs: figures?.overs || '0.0',
        maidens: figures?.maidens || 0,
        runs: figures?.runsConceded || 0,
        wickets: figures?.wickets || 0,
        economy: figures?.economy || 0,
        isBowling: false,
      }
    }).filter(b => b.overs !== '0.0')
  }

  const inn1BattingIds = isTeamABattingFirst ? match.teamAPlayerIds : match.teamBPlayerIds
  const inn1FieldingIds = isTeamABattingFirst ? match.teamBPlayerIds : match.teamAPlayerIds

  const inn2BattingIds = inn1FieldingIds
  const inn2FieldingIds = inn1BattingIds

  const inn1Batters = buildBatters(inn1State, inn1BattingIds)
  const inn1Bowlers = buildBowlers(inn1State, inn1FieldingIds)

  const inn2Batters = buildBatters(inn2State, inn2BattingIds)
  const inn2Bowlers = buildBowlers(inn2State, inn2FieldingIds)

  const inn1Shots = inn1Events
    .filter(e => !e.isUndone && e.shotX !== null && e.shotY !== null)
    .map(e => ({ x: e.shotX!, y: e.shotY!, runs: e.runsOffBat, zone: e.shotZone }))

  const inn2Shots = inn2Events
    .filter(e => !e.isUndone && e.shotX !== null && e.shotY !== null)
    .map(e => ({ x: e.shotX!, y: e.shotY!, runs: e.runsOffBat, zone: e.shotZone }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Match Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-light">
              <Link href="/" className="hover:text-[#0066CC] flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>Match Centre</span>
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700">{match.oversLimit} Overs Official Scorecard</span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-light text-[#001838] uppercase tracking-wide">
              {match.teamAName} <span className="font-mono text-slate-400 font-light">vs</span> {match.teamBName}
            </h1>
            {match.tossWinner && (
              <p className="text-xs text-slate-600 font-light">
                Toss: <strong className="font-medium text-[#001838]">{match.tossWinner}</strong> elected to {match.tossDecision?.toLowerCase()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/score/${match.id}`}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-xs font-medium uppercase tracking-wider text-[#001838] rounded-xl border border-slate-200 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Scorer Console</span>
            </Link>
            <Link
              href={`/live/${match.id}`}
              className="px-4 py-2 bg-[#0066CC] hover:bg-[#0052A3] text-xs font-medium uppercase tracking-wider text-white rounded-xl transition-all shadow-2xs"
            >
              Live Feed
            </Link>
          </div>
        </div>

        {/* 1st Innings Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-editorial text-lg sm:text-xl font-normal uppercase tracking-wide text-[#001838]">
              1st Innings: {team1Name} ({inn1State.totalRuns}/{inn1State.totalWickets} in {inn1State.totalOvers} ov)
            </h2>
            <span className="text-xs font-mono text-slate-500">CRR: {inn1State.currentRunRate.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <BattingCard
                batters={inn1Batters}
                extras={inn1State.extras}
                totalRuns={inn1State.totalRuns}
                totalWickets={inn1State.totalWickets}
                totalOvers={inn1State.totalOvers}
              />
              <BowlingCard bowlers={inn1Bowlers} />
            </div>
            <div>
              <WagonWheel shots={inn1Shots} />
            </div>
          </div>
        </section>

        {/* 2nd Innings Section (if recorded) */}
        {(inn2Events.length > 0 || match.currentInnings >= 2) && (
          <section className="space-y-4 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-editorial text-lg sm:text-xl font-normal uppercase tracking-wide text-[#001838]">
                2nd Innings: {team2Name} ({inn2State.totalRuns}/{inn2State.totalWickets} in {inn2State.totalOvers} ov)
              </h2>
              <span className="text-xs font-mono text-slate-500">
                {target ? `Target: ${target} • CRR: ${inn2State.currentRunRate.toFixed(2)}` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <BattingCard
                  batters={inn2Batters}
                  extras={inn2State.extras}
                  totalRuns={inn2State.totalRuns}
                  totalWickets={inn2State.totalWickets}
                  totalOvers={inn2State.totalOvers}
                />
                <BowlingCard bowlers={inn2Bowlers} />
              </div>
              <div>
                <WagonWheel shots={inn2Shots} />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}



