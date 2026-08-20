'use client'
import { Trophy, Award, Flame, Zap } from 'lucide-react'

interface PlayerMVP {
  id: string
  name: string
  teamName: string
  runs: number
  balls: number
  fours: number
  sixes: number
  wickets: number
  maidens: number
  runsConceded: number
  mvpPoints: number
}

interface MatchSuperstarsProps {
  players: Record<string, { id: string; name: string }>
  teamAName: string
  teamBName: string
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
  inn1BatterStats?: Record<string, any>
  inn1BowlerFigures?: Record<string, any>
  inn2BatterStats?: Record<string, any>
  inn2BowlerFigures?: Record<string, any>
}

export function MatchSuperstars({
  players,
  teamAName,
  teamBName,
  teamAPlayerIds,
  teamBPlayerIds,
  inn1BatterStats = {},
  inn1BowlerFigures = {},
  inn2BatterStats = {},
  inn2BowlerFigures = {},
}: MatchSuperstarsProps) {
  const allPlayerIds = Array.from(new Set([...teamAPlayerIds, ...teamBPlayerIds]))

  const ranked: PlayerMVP[] = allPlayerIds.map(pid => {
    const pInfo = players[pid]
    const isTeamA = teamAPlayerIds.includes(pid)
    const teamName = isTeamA ? teamAName : teamBName

    // Batting stats (inn1 + inn2)
    const b1 = inn1BatterStats[pid] || {}
    const b2 = inn2BatterStats[pid] || {}
    const runs = (b1.runs || 0) + (b2.runs || 0)
    const balls = (b1.ballsFaced || 0) + (b2.ballsFaced || 0)
    const fours = (b1.fours || 0) + (b2.fours || 0)
    const sixes = (b1.sixes || 0) + (b2.sixes || 0)

    // Bowling stats (inn1 + inn2)
    const bw1 = inn1BowlerFigures[pid] || {}
    const bw2 = inn2BowlerFigures[pid] || {}
    const wickets = (bw1.wickets || 0) + (bw2.wickets || 0)
    const maidens = (bw1.maidens || 0) + (bw2.maidens || 0)
    const runsConceded = (bw1.runsConceded || 0) + (bw2.runsConceded || 0)

    // Stumps App MVP Formula:
    // 1 pt per run, 1 bonus per 4, 2 bonus per 6
    // 25 pts per wicket, 15 pts per maiden
    // 10 bonus if strike rate >= 150 (min 10 runs)
    let pts = runs + fours * 1 + sixes * 2 + wickets * 25 + maidens * 15
    if (runs >= 10 && balls > 0 && (runs / balls) >= 1.5) pts += 10
    if (wickets >= 3) pts += 15

    return {
      id: pid,
      name: pInfo?.name || `Player (${pid.slice(0, 4)})`,
      teamName,
      runs,
      balls,
      fours,
      sixes,
      wickets,
      maidens,
      runsConceded,
      mvpPoints: pts,
    }
  }).filter(p => p.runs > 0 || p.balls > 0 || p.wickets > 0 || p.runsConceded > 0)
    .sort((a, b) => b.mvpPoints - a.mvpPoints)

  if (ranked.length === 0) return null

  const topPerformer = ranked[0]
  const otherRanked = ranked.slice(1, 4)

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#D97706]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#001838]">
            Match Superstars & MVP Rating
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Performance Points</span>
      </div>

      {/* Top 1 MVP Hero Card */}
      {topPerformer && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              #1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{topPerformer.name}</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-medium">MVP Leader</span>
              </div>
              <p className="text-[11px] text-slate-600 font-light">
                {topPerformer.teamName} • {topPerformer.runs} runs ({topPerformer.balls}b) {topPerformer.wickets > 0 ? `• ${topPerformer.wickets} wkts` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold text-amber-700">{topPerformer.mvpPoints}</div>
            <div className="text-[10px] text-slate-500 uppercase">MVP Pts</div>
          </div>
        </div>
      )}

      {/* Runners up */}
      {otherRanked.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {otherRanked.map((player, idx) => (
            <div key={player.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <span className="font-mono text-slate-400">#{idx + 2}</span>
                  <span className="truncate max-w-[100px]">{player.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-light">
                  {player.runs}r {player.wickets > 0 ? `• ${player.wickets}w` : ''}
                </div>
              </div>
              <div className="text-right font-mono font-medium text-[#0066CC]">
                {player.mvpPoints} <span className="text-[9px] text-slate-400 font-sans">pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
