'use client'
import { useState, use } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { LiveScoreboard } from '@/components/live/LiveScoreboard'
import { BattingCard, BatterRow } from '@/components/live/BattingCard'
import { BowlingCard, BowlerRow } from '@/components/live/BowlingCard'
import { WagonWheel, Shot } from '@/components/live/WagonWheel'
import { OverByOverChart } from '@/components/live/OverByOverChart'
import { WormChart } from '@/components/live/WormChart'
import { MatchSuperstars } from '@/components/live/MatchSuperstars'
import { OverHistory } from '@/components/scoring/OverHistory'
import { useMatchState } from '@/hooks/useMatchState'
import { Radio, ArrowLeft, Share2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ matchId: string }>
}

export default function LiveMatchPage({ params }: PageProps) {
  const { matchId } = use(params)
  const { data, loading, error } = useMatchState(matchId, 2500)
  const [pickedInnings, setSelectedInnings] = useState<1 | 2 | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-slate-500 font-mono text-xs uppercase tracking-widest font-light">
            Connecting to live telemetry feed...
          </div>
        </div>
      </div>
    )
  }

  if (error || !data || !data.match) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h2 className="font-editorial text-xl text-[#001838]">Match Stream Unavailable</h2>
          <p className="text-xs text-slate-500 font-light">{error || 'Match record not found in system.'}</p>
          <Link href="/" className="inline-block bg-[#001838] px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider text-white hover:bg-[#0A2540] transition-colors shadow-md">
            Return to Match Centre
          </Link>
        </div>
      </div>
    )
  }

  const { match, players, innings1, innings2, rawEvents } = data
  const summary: any = (data as any).summary
  const resultText: string | null = summary?.result?.text ?? null
  const currentInnings = match.currentInnings
  // Default to the innings in play (the chase once it has started)
  const selectedInnings: 1 | 2 = pickedInnings ?? (innings2 ? 2 : 1)
  const activeInningsNumber = innings2 && selectedInnings === 2 ? 2 : (currentInnings === 2 && selectedInnings === 2 ? 2 : 1)
  const activeInnings = activeInningsNumber === 2 && innings2 ? innings2 : innings1

  // Batting team name for active innings
  const isTeamABattingFirst = (match.tossWinner === match.teamAName && match.tossDecision === 'BAT') ||
                              (match.tossWinner === match.teamBName && match.tossDecision === 'BOWL')
  
  const battingTeamName = activeInningsNumber === 1
    ? (isTeamABattingFirst ? match.teamAName : match.teamBName)
    : (isTeamABattingFirst ? match.teamBName : match.teamAName)

  // Construct Batters list
  const battingPlayerIds = (activeInningsNumber === 1 ? isTeamABattingFirst : !isTeamABattingFirst)
    ? match.teamAPlayerIds
    : match.teamBPlayerIds

  const battersList: BatterRow[] = battingPlayerIds.map(pid => {
    const stats = activeInnings.batterStats?.[pid]
    const pInfo = players[pid]
    const isOnStrike = activeInnings.strikerId === pid
    const isDismissed = stats?.isOut || false

    let howOutStr = ''
    if (stats?.isOut) {
      if (stats.wicketType === 'BOWLED') howOutStr = `b ${players[stats.bowlerIdWhoGotOut]?.name || 'bowler'}`
      else if (stats.wicketType === 'CAUGHT') howOutStr = `c ${players[stats.fielderIdWhoCaught]?.name || 'fielder'} b ${players[stats.bowlerIdWhoGotOut]?.name || 'bowler'}`
      else if (stats.wicketType === 'LBW') howOutStr = `lbw b ${players[stats.bowlerIdWhoGotOut]?.name || 'bowler'}`
      else if (stats.wicketType === 'RUN_OUT') howOutStr = `run out (${players[stats.fielderIdWhoCaught]?.name || 'fielder'})`
      else if (stats.wicketType === 'STUMPED') howOutStr = `st ${players[stats.fielderIdWhoCaught]?.name || 'wk'} b ${players[stats.bowlerIdWhoGotOut]?.name || 'bowler'}`
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
      isOut: isDismissed,
      isOnStrike,
      howOut: howOutStr,
    }
  }).filter(b => b.balls > 0 || b.isOut || b.isOnStrike || activeInnings.nonStrikerId === b.id)

  // Construct Bowlers list
  const fieldingPlayerIds = (activeInningsNumber === 1 ? isTeamABattingFirst : !isTeamABattingFirst)
    ? match.teamBPlayerIds
    : match.teamAPlayerIds

  const bowlersList: BowlerRow[] = fieldingPlayerIds.map(pid => {
    const figures = activeInnings.bowlerFigures?.[pid]
    const pInfo = players[pid]
    const isBowling = activeInnings.currentBowlerId === pid

    return {
      id: pid,
      name: pInfo?.name || `Player (${pid.slice(0, 4)})`,
      overs: figures?.overs || '0.0',
      maidens: figures?.maidens || 0,
      runs: figures?.runsConceded || 0,
      wickets: figures?.wickets || 0,
      economy: figures?.economy || 0,
      isBowling,
    }
  }).filter(b => b.overs !== '0.0' || b.isBowling)

  // Shots for Wagon Wheel
  const shots: Shot[] = (rawEvents || [])
    .filter((e: any) => e.inningsNo === activeInningsNumber && !e.isUndone && e.shotX !== null && e.shotY !== null)
    .map((e: any) => ({
      x: e.shotX,
      y: e.shotY,
      runs: e.runsOffBat,
      zone: e.shotZone,
    }))

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Match Header Breadcrumbs & Status Bar (Cricinfo Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-light">
              <Link href="/" className="hover:text-[#0066CC] flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>Match Centre</span>
              </Link>
              <span>/</span>
              {(match as any).tournament ? (
                <Link href={`/tournaments/${(match as any).tournament.id}`} className="hover:text-[#0066CC] text-slate-700 truncate">
                  {(match as any).tournament.name}{(match as any).matchLabel ? ` · ${(match as any).matchLabel}` : ''}
                </Link>
              ) : (
                <span className="font-mono text-slate-700">{match.oversLimit} Overs Format</span>
              )}
              <span className="hidden sm:inline">/</span>
              <span className="hidden sm:inline">{match.teamAName} vs {match.teamBName}</span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-light text-[#001838] tracking-wide uppercase">
              {match.teamAName} <span className="font-mono text-slate-400 font-light">vs</span> {match.teamBName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Innings Tabs */}
            {innings2 && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedInnings(1)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer font-medium ${
                    activeInningsNumber === 1
                      ? 'bg-[#001838] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1st Inn
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInnings(2)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer font-medium ${
                    activeInningsNumber === 2
                      ? 'bg-[#001838] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2nd Inn
                </button>
              </div>
            )}

            <Link
              href={`/matches/${match.id}/scorecard`}
              className="text-xs font-medium uppercase tracking-wider text-[#001838] hover:bg-slate-100 bg-white px-4 py-2 rounded-xl border border-slate-200 transition-colors shadow-xs"
            >
              Full Scorecard ➔
            </Link>
          </div>
        </div>

        {/* Live Score Ticker Banner */}
        <LiveScoreboard
          teamName={battingTeamName}
          score={activeInnings.totalRuns || 0}
          wickets={activeInnings.totalWickets || 0}
          overs={activeInnings.totalOvers || '0.0'}
          crr={activeInnings.currentRunRate || 0}
          rrr={activeInnings.requiredRunRate || null}
          target={activeInnings.target || null}
          matchStatus={match.status}
          result={resultText}
        />

        {/* Over History Ribbon */}
        <OverHistory
          currentOverBalls={activeInnings.currentOverBalls || []}
          overSummaries={activeInnings.overSummaries || []}
        />

        {/* Main Grid: Batting & Bowling Cards + Spatial Wagon Wheel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Batting & Bowling Cards */}
          <div className="lg:col-span-2 space-y-6">
            <BattingCard
              batters={battersList}
              extras={activeInnings.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }}
              totalRuns={activeInnings.totalRuns || 0}
              totalWickets={activeInnings.totalWickets || 0}
              totalOvers={activeInnings.totalOvers || '0.0'}
            />

            <BowlingCard bowlers={bowlersList} />

            {/* Over-by-Over Manhattan Bar Chart */}
            <OverByOverChart overSummaries={activeInnings.overSummaries || []} />

            {/* Worm Chart (Cumulative Runs Comparison) */}
            <WormChart
              inn1Summaries={innings1?.overSummaries || []}
              inn2Summaries={innings2?.overSummaries || []}
              team1Name={isTeamABattingFirst ? match.teamAName : match.teamBName}
              team2Name={isTeamABattingFirst ? match.teamBName : match.teamAName}
            />

            {/* Match Superstars & MVP Rating (Stumps App Feature) */}
            <MatchSuperstars
              players={players}
              teamAName={match.teamAName}
              teamBName={match.teamBName}
              teamAPlayerIds={match.teamAPlayerIds}
              teamBPlayerIds={match.teamBPlayerIds}
              inn1BatterStats={innings1?.batterStats}
              inn1BowlerFigures={innings1?.bowlerFigures}
              inn2BatterStats={innings2?.batterStats}
              inn2BowlerFigures={innings2?.bowlerFigures}
            />
          </div>

          {/* Right 1 Col: Wagon Wheel & Fall of Wickets */}
          <div className="space-y-6">
            <WagonWheel shots={shots} />

            {/* Fall of Wickets Card */}
            {activeInnings.fallOfWickets && activeInnings.fallOfWickets.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#001838] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  Fall of Wickets
                </h3>
                <div className="space-y-1.5 font-light">
                  {activeInnings.fallOfWickets.map((fow: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                      <div className="text-slate-800">
                        <span className="font-mono text-[#0066CC] mr-2 font-medium">{fow.wicketNumber}-{fow.runs}</span>
                        <span className="font-normal">{players[fow.playerId]?.name || 'Batter'}</span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px] font-light">{fow.overs} ov</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}




