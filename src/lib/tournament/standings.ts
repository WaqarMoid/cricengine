import { MatchSummary } from '../engine/match-summary'

/**
 * Pure tournament maths: points table (with ICC-style Net Run Rate),
 * knockout bracket resolution and stat leaders.
 *
 * Rules used (documented in docs/TOURNAMENTS.md):
 *  - Win = 2 pts, Tie / No result = 1 pt each, Loss = 0
 *  - NRR = (runs scored / overs faced) - (runs conceded / overs bowled)
 *    A side that is bowled out is charged the full quota of overs (ICC rule).
 *  - Order: points, then NRR, then wins, then team name (stable)
 *  - Semi-finals cross over: A1 v B2, B1 v A2. Final: W(SF1) v W(SF2)
 */

export type Stage = 'GROUP' | 'SEMI_FINAL' | 'FINAL' | 'LEAGUE' | 'QUALIFIER' | 'ELIMINATOR' | 'THIRD_PLACE'

export interface TeamRef {
  id: string
  name: string
  shortName?: string | null
  groupName?: string | null
}

export interface TournamentMatchInput {
  id: string
  stage: string | null
  groupName: string | null
  matchNumber: number | null
  teamAId: string | null
  teamBId: string | null
  oversLimit: number
  summary: MatchSummary
}

export interface StandingRow {
  teamId: string
  teamName: string
  shortName: string | null
  groupName: string
  played: number
  won: number
  lost: number
  tied: number
  noResult: number
  points: number
  runsFor: number
  ballsFaced: number
  runsAgainst: number
  ballsBowled: number
  nrr: number
  form: Array<'W' | 'L' | 'T' | 'N'>
  position: number
  qualified: boolean
}

export const POINTS = { WIN: 2, TIE: 1, NO_RESULT: 1, LOSS: 0 }

function emptyRow(t: TeamRef): StandingRow {
  return {
    teamId: t.id,
    teamName: t.name,
    shortName: t.shortName ?? null,
    groupName: t.groupName || 'League',
    played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0,
    runsFor: 0, ballsFaced: 0, runsAgainst: 0, ballsBowled: 0,
    nrr: 0, form: [], position: 0, qualified: false,
  }
}

/** Which team (by tournament team id) batted in a given innings index. */
function sideTeamId(m: TournamentMatchInput, side: 'A' | 'B') {
  return side === 'A' ? m.teamAId : m.teamBId
}

export function computeStandings(
  teams: TeamRef[],
  matches: TournamentMatchInput[],
  qualifyPerGroup = 2,
): Record<string, StandingRow[]> {
  const rows = new Map<string, StandingRow>()
  teams.forEach(t => rows.set(t.id, emptyRow(t)))

  const groupMatches = matches
    .filter(m => (m.stage === 'GROUP' || m.stage === 'LEAGUE' || !m.stage) && m.summary.isComplete)
    .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))

  for (const m of groupMatches) {
    if (!m.teamAId || !m.teamBId) continue
    const a = rows.get(m.teamAId)
    const b = rows.get(m.teamBId)
    if (!a || !b) continue
    const res = m.summary.result!
    a.played++; b.played++

    if (res.isNoResult) {
      a.noResult++; b.noResult++
      a.points += POINTS.NO_RESULT; b.points += POINTS.NO_RESULT
      a.form.push('N'); b.form.push('N')
      continue // no-result matches are excluded from NRR
    }
    if (res.isTie) {
      a.tied++; b.tied++
      a.points += POINTS.TIE; b.points += POINTS.TIE
      a.form.push('T'); b.form.push('T')
    } else {
      const winner = res.winner === 'A' ? a : b
      const loser = res.winner === 'A' ? b : a
      winner.won++; winner.points += POINTS.WIN; winner.form.push('W')
      loser.lost++; loser.form.push('L')
    }

    // NRR inputs
    for (const inn of m.summary.innings) {
      const batId = sideTeamId(m, inn.side)
      const bowlId = sideTeamId(m, inn.side === 'A' ? 'B' : 'A')
      const balls = inn.allOut ? m.oversLimit * 6 : inn.legalBalls
      const bat = batId ? rows.get(batId) : undefined
      const bowl = bowlId ? rows.get(bowlId) : undefined
      if (bat) { bat.runsFor += inn.runs; bat.ballsFaced += balls }
      if (bowl) { bowl.runsAgainst += inn.runs; bowl.ballsBowled += balls }
    }
  }

  const byGroup: Record<string, StandingRow[]> = {}
  for (const r of rows.values()) {
    r.nrr = (r.ballsFaced > 0 ? r.runsFor / (r.ballsFaced / 6) : 0) -
      (r.ballsBowled > 0 ? r.runsAgainst / (r.ballsBowled / 6) : 0)
    r.nrr = Math.round(r.nrr * 1000) / 1000
    ;(byGroup[r.groupName] ||= []).push(r)
  }
  for (const g of Object.keys(byGroup)) {
    byGroup[g].sort((x, y) =>
      y.points - x.points || y.nrr - x.nrr || y.won - x.won || x.teamName.localeCompare(y.teamName))
    const n = byGroup[g].length
    const groupDone = byGroup[g].every(r => r.played >= n - 1)
    byGroup[g].forEach((r, i) => {
      r.position = i + 1
      r.qualified = groupDone && i < qualifyPerGroup
    })
  }
  return byGroup
}

export function isGroupStageComplete(teams: TeamRef[], matches: TournamentMatchInput[]): boolean {
  // Round robin inside each group: n*(n-1)/2 matches per group
  const groups = new Map<string, number>()
  teams.forEach(t => groups.set(t.groupName || 'League', (groups.get(t.groupName || 'League') || 0) + 1))
  let expected = 0
  groups.forEach(n => { expected += (n * (n - 1)) / 2 })
  const done = matches.filter(m => (m.stage === 'GROUP' || m.stage === 'LEAGUE') && m.summary.isComplete).length
  return expected > 0 && done >= expected
}

export interface BracketSlot {
  label: string
  stage: 'SEMI_FINAL' | 'FINAL'
  matchNumber: number
  seedA: string // e.g. "A1" or "W:SF1"
  seedB: string
  teamA: TeamRef | null
  teamB: TeamRef | null
  projected: boolean // true when the teams come from a live table, not a played match
  matchId: string | null
  resultText: string | null
  winnerId: string | null
}

/**
 * Two-group knockout: SF1 = A1 v B2, SF2 = B1 v A2, Final = W(SF1) v W(SF2).
 * Uses real knockout matches if they exist; otherwise projects from the table.
 */
export function computeKnockoutBracket(
  teams: TeamRef[],
  matches: TournamentMatchInput[],
  standings: Record<string, StandingRow[]>,
): BracketSlot[] {
  const teamById = new Map(teams.map(t => [t.id, t]))
  const groupNames = Object.keys(standings).sort()
  if (groupNames.length < 2) return []
  const [g1, g2] = groupNames
  const at = (g: string, pos: number) => {
    const r = standings[g]?.[pos - 1]
    return r ? teamById.get(r.teamId) ?? null : null
  }
  const groupsDone = isGroupStageComplete(teams, matches)

  const semis = matches
    .filter(m => m.stage === 'SEMI_FINAL')
    .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
  const finalMatch = matches.find(m => m.stage === 'FINAL') || null

  const winnerOf = (m: TournamentMatchInput | undefined | null): string | null => {
    if (!m || !m.summary.result || !m.summary.result.winner) return null
    return m.summary.result.winner === 'A' ? m.teamAId : m.teamBId
  }

  const slotFromMatch = (
    m: TournamentMatchInput | undefined | null,
    label: string, stage: 'SEMI_FINAL' | 'FINAL', no: number,
    seedA: string, seedB: string, projA: TeamRef | null, projB: TeamRef | null,
  ): BracketSlot => {
    if (m) {
      return {
        label, stage, matchNumber: m.matchNumber ?? no, seedA, seedB,
        teamA: m.teamAId ? teamById.get(m.teamAId) ?? null : null,
        teamB: m.teamBId ? teamById.get(m.teamBId) ?? null : null,
        projected: false,
        matchId: m.id,
        resultText: m.summary.result?.text ?? null,
        winnerId: winnerOf(m),
      }
    }
    return {
      label, stage, matchNumber: no, seedA, seedB,
      teamA: projA, teamB: projB, projected: true,
      matchId: null, resultText: null, winnerId: null,
    }
  }

  // Before any group game is played there is nothing meaningful to project.
  const anyGroupPlayed = matches.some(m => m.stage === 'GROUP' && m.summary.isComplete)
  const proj = (g: string, pos: number) => (anyGroupPlayed ? at(g, pos) : null)

  const sf1 = slotFromMatch(semis[0], 'Semi-final 1', 'SEMI_FINAL', 0, `${g1}1`, `${g2}2`, proj(g1, 1), proj(g2, 2))
  const sf2 = slotFromMatch(semis[1], 'Semi-final 2', 'SEMI_FINAL', 0, `${g2}1`, `${g1}2`, proj(g2, 1), proj(g1, 2))
  const w1 = sf1.winnerId ? teamById.get(sf1.winnerId) ?? null : null
  const w2 = sf2.winnerId ? teamById.get(sf2.winnerId) ?? null : null
  const fin = slotFromMatch(finalMatch, 'Final', 'FINAL', 0, 'W SF1', 'W SF2', w1, w2)
  // "projected" also tells the UI the group stage is still open
  if (!groupsDone) { if (!semis[0]) sf1.projected = true; if (!semis[1]) sf2.projected = true }
  return [sf1, sf2, fin]
}

export interface LeaderRow {
  playerId: string
  teamId: string | null
  value: number
  detail: string
}

export interface Leaders {
  mostRuns: LeaderRow[]
  mostWickets: LeaderRow[]
  highestScore: LeaderRow[]
  bestBowling: LeaderRow[]
  mostSixes: LeaderRow[]
  bestEconomy: LeaderRow[]
}

/** Aggregate batting/bowling across every innings of every tournament match. */
export function computeLeaders(
  matches: Array<TournamentMatchInput & { teamAPlayerIds: string[]; teamBPlayerIds: string[] }>,
  limit = 5,
): Leaders {
  const bat = new Map<string, { runs: number; balls: number; outs: number; inns: number; sixes: number; fours: number; hs: number; hsBalls: number; hsNotOut: boolean }>()
  const bowl = new Map<string, { wkts: number; runs: number; balls: number; bestW: number; bestR: number }>()
  const teamOfPlayer = new Map<string, string | null>()

  for (const m of matches) {
    m.teamAPlayerIds.forEach(p => teamOfPlayer.set(p, m.teamAId))
    m.teamBPlayerIds.forEach(p => teamOfPlayer.set(p, m.teamBId))
    for (const st of m.summary.states) {
      for (const b of st.batterStats.values()) {
        if (b.ballsFaced === 0 && !b.isOut) continue
        const r = bat.get(b.playerId) || { runs: 0, balls: 0, outs: 0, inns: 0, sixes: 0, fours: 0, hs: -1, hsBalls: 0, hsNotOut: false }
        r.runs += b.runs; r.balls += b.ballsFaced; r.inns += 1
        r.outs += b.isOut ? 1 : 0; r.sixes += b.sixes; r.fours += b.fours
        if (b.runs > r.hs || (b.runs === r.hs && b.ballsFaced < r.hsBalls)) {
          r.hs = b.runs; r.hsBalls = b.ballsFaced; r.hsNotOut = !b.isOut
        }
        bat.set(b.playerId, r)
      }
      for (const f of st.bowlerFigures.values()) {
        if (f.totalBallsBowled === 0) continue
        const r = bowl.get(f.playerId) || { wkts: 0, runs: 0, balls: 0, bestW: -1, bestR: 0 }
        r.wkts += f.wickets; r.runs += f.runsConceded; r.balls += f.totalBallsBowled
        if (f.wickets > r.bestW || (f.wickets === r.bestW && f.runsConceded < r.bestR)) {
          r.bestW = f.wickets; r.bestR = f.runsConceded
        }
        bowl.set(f.playerId, r)
      }
    }
  }

  const ov = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`
  const batRows = [...bat.entries()]
  const bowlRows = [...bowl.entries()]

  return {
    mostRuns: batRows
      .sort((x, y) => y[1].runs - x[1].runs || x[1].balls - y[1].balls)
      .slice(0, limit)
      .map(([id, r]) => ({
        playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: r.runs,
        detail: `${r.inns} inns · SR ${r.balls ? ((r.runs / r.balls) * 100).toFixed(1) : '0.0'} · Avg ${r.outs ? (r.runs / r.outs).toFixed(1) : '—'}`,
      })),
    highestScore: batRows
      .sort((x, y) => y[1].hs - x[1].hs || x[1].hsBalls - y[1].hsBalls)
      .slice(0, limit)
      .map(([id, r]) => ({ playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: r.hs, detail: `${r.hs}${r.hsNotOut ? '*' : ''} (${r.hsBalls})` })),
    mostSixes: batRows
      .filter(([, r]) => r.sixes > 0)
      .sort((x, y) => y[1].sixes - x[1].sixes || y[1].runs - x[1].runs)
      .slice(0, limit)
      .map(([id, r]) => ({ playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: r.sixes, detail: `${r.fours} fours` })),
    mostWickets: bowlRows
      .sort((x, y) => y[1].wkts - x[1].wkts || (x[1].runs / Math.max(1, x[1].balls)) - (y[1].runs / Math.max(1, y[1].balls)))
      .slice(0, limit)
      .map(([id, r]) => ({
        playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: r.wkts,
        detail: `${ov(r.balls)} ov · Econ ${r.balls ? (r.runs / (r.balls / 6)).toFixed(2) : '0.00'}`,
      })),
    bestBowling: bowlRows
      .sort((x, y) => y[1].bestW - x[1].bestW || x[1].bestR - y[1].bestR)
      .slice(0, limit)
      .map(([id, r]) => ({ playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: r.bestW, detail: `${r.bestW}/${r.bestR}` })),
    bestEconomy: bowlRows
      .filter(([, r]) => r.balls >= 18)
      .sort((x, y) => (x[1].runs / x[1].balls) - (y[1].runs / y[1].balls))
      .slice(0, limit)
      .map(([id, r]) => ({ playerId: id, teamId: teamOfPlayer.get(id) ?? null, value: Math.round((r.runs / (r.balls / 6)) * 100) / 100, detail: `${ov(r.balls)} ov · ${r.wkts} wkts` })),
  }
}
